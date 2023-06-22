# How To Use

````
node index.js [coef, itemLvlMax, item, customItemStats, focusedRune, minRentability, sortByRentNoFocus, sortByRentFocus]
````

Arguments breakdown:
- **coef**: Le coéficient obtenu (ou potentiel) du brisage
````
coef=42
````

- **itemLvlMax**: Niveau maximum de l'item (pour le listing)
````
itemLvlMax=102
````

- **item**: Item à tester
````
item="Casque"
````

- **customItemStats**: À utiliser avec **item**, sert à donner des stats persos pour un item donné
````
item="Casque" customItemStats=true
````

- **focusedRune**: Filtrer les objets ne donnant que cette rune pour focus
````
focusedRune="Cri"
````

- **minRentability**: Rentabilité minimale
````
minRentability=30000
````

- **sortByRentNoFocus**: Filtre pour trier les items par rentabilité en cas de non-focus
````
sortByRentNoFocus=true
````

- **sortByRentFocus**: Filtre pour trier les items par rentabilité en cas de focus optimal
````
sortByRentFocus=true
````

