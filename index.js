

function createFile(name, data) {
    var fs = require('fs');
    fs.writeFile(`${name}.json`, data, 'utf8', () => console.log('ok'));
}

function createStat(stat) {
    return {
        name: stat.stat,
        avg: stat.minStat !== null ? Math.round((stat.minStat + stat.maxStat) / 2) : stat.maxStat,
        min: stat.minStat,
        max: stat.maxStat
    }
}

function createItem(item) {
    return {
        name: item.name.fr,
        level: item.level,
        stats: item?.stats ? item.stats.map((stat) => createStat(stat)) : []
    }
}

function parseItems() {
    const items = itemsList.map((item) => createItem(item))

    return items;
}

function findRune(stat) {
    const runes = require("./runes.json");

    return runes.find((rune) => rune.stat === stat)
}

function computePDB(jet, rune, item_lvl) {
    return 3 * jet * rune.poids_unitaire * item_lvl / 200 + 1
}


function computeNoFocus(pdb, coef, poids_normal) {
    return pdb * coef / 100 / poids_normal;
}

function computeFocus(focusedPdb, items_stats, item_lvl, rune, coef) {
    let aggregatedPDB = 0;

    items_stats.forEach((stat) => {
        aggregatedPDB += computePDB(stat.avg, findRune(stat.name), item_lvl);
    })

    return (focusedPdb + 0.5 * aggregatedPDB) * coef / 100 / rune.poids_normal;
}

function breaklist(coef = 50) {
    const allItems = require("./combined.json");

    const list = allItems.map((item) => {
        const noFocus = {};
        const focus = {};
        let noFocusRentability = 0;
        let focusRentability = 0;
        let focusedRune = "";
        let focusedRuneAmount = 0;


        item.stats.forEach((stat) => {
            const rune = findRune(stat.name);
            const pdb = computePDB(stat.avg, rune, item.level);
            const noFocusValue = computeNoFocus(pdb, coef, rune.poids_normal);

            if (noFocusValue > 0) {
                noFocus[rune.rune] = Number(noFocusValue.toPrecision(4));
            }
            focus[rune.rune] = computeFocus(pdb, item.stats.filter((s) => s.name !== stat.name), item.level, rune, coef)

            if (!isNaN(noFocus[rune.rune])) {
                noFocusRentability += Math.floor(noFocus[rune.rune]) * Number(rune.prix);
            }

            if (Math.floor(focus[rune.rune]) * Number(rune.prix) > focusRentability) {
                // Mettre quelle rune est focus
                focusRentability = Math.floor(focus[rune.rune]) * Number(rune.prix);
                focusedRune = rune.rune;
                focusedRuneAmount = Math.floor(focus[rune.rune]);
            }
        })


        return {
            itemName: item.name,
            itemLvl: item.level,
            withoutFocus: noFocus,
            withFocus: focus,
            focusedRune,
            noFocusRentability,
            focusRentability,
            focusedRuneAmount
        }
    })

    //    return JSON.stringify(list);
    return list
}

function breakItem(coef, itemName, itemStats = undefined) {
    const allItems = require("./combined.json");
    const item = allItems.find((item) => item.name.toLowerCase() === itemName.toLowerCase())

    if (!item) {
        console.log(`Item "${itemName}" not found.`)
        process.exit(1)
    }

    let stats = itemStats ? itemStats : item.stats;

    const noFocus = {};
    const focus = {};
    let noFocusRentability = 0;
    let focusRentability = 0;
    let focusedRune = "";
    let focusedRuneAmount = 0;


    stats.forEach((stat) => {
        const rune = findRune(stat.name);
        const pdb = computePDB(stat.avg, rune, item.level);
        const noFocusValue = computeNoFocus(pdb, coef, rune.poids_normal);

        if (noFocusValue > 0) {
            noFocus[rune.rune] = Number(noFocusValue.toPrecision(4));
        }
        focus[rune.rune] = computeFocus(pdb, item.stats.filter((s) => s.name !== stat.name), item.level, rune, coef)

        if (!isNaN(noFocus[rune.rune])) {
            noFocusRentability += Math.floor(noFocus[rune.rune]) * Number(rune.prix);
        }

        if (Math.floor(focus[rune.rune]) * Number(rune.prix) > focusRentability) {
            focusRentability = Math.floor(focus[rune.rune]) * Number(rune.prix);
            focusedRune = rune.rune;
            focusedRuneAmount =Math.floor(focus[rune.rune])
        }
    })


    return {
        itemName: item.name,
        itemLvl: item.level,
        withoutFocus: noFocus,
        withFocus: focus,
        focusedRune,
        noFocusRentability,
        focusRentability,
        focusedRuneAmount
    }
}

function runesList() {
    const runes = require('./runes.json');

    const NF = runes.map((rune) => `[NF] - ${rune.rune}`)
    const F = runes.map((rune) => `${rune.rune}`)

    createFile('NF_runes_names', JSON.stringify(NF))
    createFile('F_runes_names', JSON.stringify(F))
}

async function askItemStats(itemName) {
    const allItems = require("./combined.json");
    const readline = require('readline/promises');
    const { stdin, stdout } = require('process');
    const item = allItems.find((item) => item.name.toLowerCase() === itemName.toLowerCase());
    const givenStats = [];

    if (!item) {
        console.log(`Item "${itemName}" not found.`)
        process.exit(1)
    }

    const rl = readline.createInterface(stdin, stdout);

    for (let stat of item.stats) {
        const q = await rl.question(stat.name + ': ');

        if (!isNaN(q) && q !== "") {
            givenStats.push({ name: stat.name, avg: Number(q) })
        }
    }

    rl.close();

    return givenStats;
}


async function agrumentsParser() {
    const args = process.argv.slice(2);
    const parsed = {
        coef: null,
        item: null,
        itemLvlMax: null,
        itemLvlSort: false,
        customItemStats: null,
        focusedRune: null,
        minRentability: null,
        sortByRentFocus: false,
        sortByRentNoFocus: false,
    }

    args.forEach((arg) => {
        const split = arg.split('=');
        if (!(split[0] in parsed)) {
            console.log(`Argument "${split[0]}" does not exist.`)
            process.exit(1)
        }
        parsed[split[0]] = isNaN(Number(split[1])) ? split[1] : Number(split[1])
    })

    if (parsed.item && parsed.customItemStats) {
        parsed.customItemStats = await askItemStats(parsed.item);
    }

    return parsed;
}

async function main() {
    const { coef, item, itemLvlMax, itemLvlSort, customItemStats, focusedRune, minRentability, sortByRentFocus, sortByRentNoFocus } = await agrumentsParser();

    if (!coef) {
        console.log(`Argument "coef" is required.`)
        process.exit(1);
    }

    console.log('Coef:', coef, '| itemLvlMax:', itemLvlMax, '| itemLvlSort:', itemLvlSort, '| focusedRune:', focusedRune, '| minRentability:', minRentability, '| item:', item)
    let itemUnfocusedRunes = {};
    let result = undefined;
    const list = breaklist(coef);

    if (!item) {
        result = list.map((obj) => {
            if (focusedRune && obj.focusedRune !== focusedRune) return;
            if (itemLvlMax && obj.itemLvl > itemLvlMax) return;
            if (minRentability !== NaN && (minRentability > obj.focusRentability || minRentability > obj.noFocusRentability)) return;

            /*
            if (item && obj.itemName.toLowerCase() === item.toLowerCase()) {
                //            itemUnfocusedRunes = obj.withoutFocus
                for (const [key, value] of Object.entries(obj.withoutFocus)) {
                    itemUnfocusedRunes[key] = {
                        baseRunes: Math.floor(value),
                        BonusRunePercentage: String(Number(`0.${String(value).split('.')[1]}`) * 100) + ' %' || '0 %'
                    }
                }
            }
            */

            return {
                item: obj.itemName,
                level: obj.itemLvl,
                focusedRune: obj.focusedRune,
                focusedRuneAmount: obj.focusedRuneAmount,
                focusRentability: obj.focusRentability,
                noFocusRentability: obj.noFocusRentability
            }
        }).filter((r) => r !== undefined)

        if (sortByRentFocus) {
            result.sort((a, b) => a.focusRentability < b.focusRentability ? -1 : a.focusRentability > b.focusRentability ? 1 : 0)
        }

        if (sortByRentNoFocus) {
            result.sort((a, b) => a.noFocusRentability < b.noFocusRentability ? -1 : a.noFocusRentability > b.noFocusRentability ? 1 : 0)
        }
    }

    if (item) {
        const obj = breakItem(coef, item, customItemStats);

        for (const [key, value] of Object.entries(obj.withoutFocus)) {
            itemUnfocusedRunes[key] = {
                baseRunes: Math.floor(value),
                BonusRunePercentage: String(Number(`0.${String(value).split('.')[1]}`) * 100) + ' %' || '0 %'
            }
        }

        result = [{
            item: obj.itemName,
            level: obj.itemLvl,
            focusedRune: obj.focusedRune,
            focusedRuneAmount: obj.focusedRuneAmount,
            focusRentability: obj.focusRentability,
            noFocusRentability: obj.noFocusRentability
        }]
    }


    console.table(result)

    if (item) {
        console.log("Breakdown without focus:")
        console.table(itemUnfocusedRunes)
    }
}

main()