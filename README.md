# minesweeper-analyzer
Analyze the board of Minesweeper

## Usage

### Example

```javascript
const Analyzer = require("minesweeper-analyzer");


//         ....
// case1:  .1.. (2 mines)
//         ....
const analyzer1 = new Analyzer();
analyzer1.addR(0, 11, 2);
analyzer1.add([0, 1, 2, 4, 6, 8, 9, 10], 1);
analyzer1.add([5], 0);

const map1 = analyzer1.getProbabilityMap(2);


//         ....
// case2:  .1.. (? mines)
//         ....
const analyzer2 = new Analyzer();
analyzer2.add([0, 1, 2, 4, 6, 8, 9, 10], 1);
analyzer2.add([5], 0);
// Without following line,
// analyzer cannot recognize position 3, 7, and 11.
analyzer2.addR(0, 11, 0, Infinity);

const map2_1 = analyzer1.getProbabilityMap(1);
const map2_2 = analyzer1.getProbabilityMap(2);
const map2_3 = analyzer1.getProbabilityMap(3);
const map2_4 = analyzer1.getProbabilityMap(4);

```

### Reference

**.add(area, min[, max])** : boolean

Gives a infomation about number of landmines present in a certain area.
It returns whether a given information is consistent with existing information.

*area* : uint[] - List of positions

*min* : uint - Minimum number of landmines

*max* : uint - Maximum number of landmines (default is *min*)

**.addR(from, to, min[, max])** : boolean

Same as `.add([from, from + 1, ..., to], min, max)`.

**.clone()**

Returns a new Analyzer instance with the same information as this one.

**.getProbabilityMap(minesNumber)** : Record\<uint, number\> | null

Returns the probability of mine existence at each position.

*minesNumber* : uint - Total number of landmines on entire area

**.getPatternsNumber(minesNumber)** : uint

Returns the total number of mine placement patterns.

**.isValid()** : boolean

Returns whether all given information is consistent.
