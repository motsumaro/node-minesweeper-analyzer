require("should");
const Hint = require("../lib/hint");
const Analyzer = require("../lib/analyzer");

const d = (o, k = -32) => {
    switch (typeof o) {
        case "number":
            return Math.floor(o / 2 ** k + 0.5) * 2 ** k;
        case "object":
            for (let p in o) o[p] = d(o[p], k);
            return o;
        default:
            return o;
    }
}

describe("Analyzer", function () {

    describe("add", function () {

        it("solves hints", function () {
            const analyzer = new Analyzer();
            analyzer.add([0, 1, 2], 2).should.be.true();
            analyzer.add([1, 2, 3, 4, 5], 2).should.be.true();
            analyzer.add([4, 5, 6], 2).should.be.true();
            analyzer.add([10, 11, 12], 1).should.be.true();
            analyzer.add([11, 12, 13, 14, 15], 3).should.be.true();
            analyzer.add([14, 15, 16], 1).should.be.true();
            analyzer._hints.length.should.eql(10);
            analyzer._hints.filter(hint => hint.breadth === 1 && hint.min === 0 && hint.max === 0).length.should.eql(3);
            analyzer._hints.filter(hint => hint.breadth === 1 && hint.min === 1 && hint.max === 1).length.should.eql(3);
        });

        it("keeps covered area", function () {
            const analyzer = new Analyzer();
            analyzer.add([0], 1);
            analyzer.add([0, 1], 1, 2);
            analyzer._hints.length.should.eql(2);
        });

        it("returns false when a conflict is detected", function () {
            const analyzer = new Analyzer();
            analyzer.add([0, 1, 2], 1, 2).should.be.true();
            analyzer.add([0, 1, 8, 9], 1).should.be.true();
            analyzer.add([0], 1).should.be.true();
            analyzer.add([1], 1).should.be.false();
        });

    });

    describe("_classifyHints", function () {

        it("works", function () {
            const analyzer = new Analyzer();
            analyzer._hints = [
                new Hint([10, 14, 18], 1), // 2
                new Hint([12, 13, 15], 1), // 2
                new Hint([11, 16, 17], 1), // 3
                new Hint([24, 25, 26], 1), // 2
                new Hint([14, 15, 19], 1), // 2
                new Hint([15, 20, 25], 1), // 2
                new Hint([100], 0), // 0
                new Hint([101], 0), // 0
                new Hint([110], 1), // 1
                new Hint([111], 1), // 1
            ];
            const result = analyzer._classifyHints();
            result.map(x => x.length).should.eql([2, 2, 5, 1]);
            result[0].every(hint => hint.breadth === 1 && hint.min === 0).should.be.true();
            result[1].every(hint => hint.breadth === 1 && hint.min === 1).should.be.true();
            // console.log(result.map(hints => hints.map(hint => hint.toString()).join("\n")).join("\n===\n"));
        });

    });

    describe("getProbabilityMap", function () {

        it("works", function () {
            const analyzer = new Analyzer();
            analyzer.add([0, 1, 2, 4, 6, 8, 9, 10], 1);     // ....
            analyzer.add([5, 6, 7, 9, 11, 13, 14, 15], 1);  // .1..
            analyzer.add([5, 10], 0);                       // ..1.
            analyzer.addR(0, 15, -Infinity, Infinity);      // ....

            const [p1, p2, p3, p4, p5] = [5 / 29, 2 / 29, 10 / 52, 27 / 52, 1 / 52];
            d([0, 1, 2, 3, 4, 5].map(i => analyzer.getProbabilityMap(i))).should.eql(d([
                null,
                { ...[0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0, 0, 0, 0] },
                { ...[p1, p1, p1, p2, p1, 0, p2, p1, p1, p2, 0, p1, p2, p1, p1, p1] },
                { ...[p3, p3, p3, p4, p3, 0, p5, p3, p3, p5, 0, p3, p4, p3, p3, p3] },
                { ...[0.2, 0.2, 0.2, 1, 0.2, 0, 0, 0.2, 0.2, 0, 0, 0.2, 1, 0.2, 0.2, 0.2] },
                null,
            ]));
        });

    });

    describe("getPatternsNumber", function () {
        
        it("works", function () {
            const analyzer = new Analyzer();
            analyzer.add([0, 1, 2, 4, 6, 8, 9, 10], 1);     // ....
            analyzer.add([5, 6, 7, 9, 11, 13, 14, 15], 1);  // .1..
            analyzer.add([5, 10], 0);                       // ..1.
            analyzer.addR(0, 15, -Infinity, Infinity);      // ....
            [0, 1, 2, 3, 4, 5].map(i => analyzer.getPatternsNumber(i)).should.eql([0, 2, 29, 52, 25, 0]);
        });
        
    });

});
