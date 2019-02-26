require("should");
const Hint = require("../lib/hint");

describe("Hint", function () {

    describe("constructor", function () {

        it("throws error with invalid arguments", function () {
            (() => new Hint([-1, 2, 3, 4], 0, 1)).should.throw();
            (() => new Hint([1, 2, 3, 4], NaN, 1)).should.throw();
            (() => new Hint([1, 2, 3, 4], 0, "foo")).should.throw();
        });

        it("eliminates duplications of positions and sorts them", function () {
            new Hint([4, 3, 2, 2, 0, 4], 1).area.should.eql([0, 2, 3, 4]);
        });

    });

    describe("equals", function () {

        it("works", function () {
            new Hint([0, 1, 2, 3], 1).equals(new Hint([3, 2, 1, 0], 1, 1)).should.be.true();
            new Hint([0, 1, 2, 3], 1).equals(new Hint([3, 2, 1, 0], 1, 2)).should.be.false();
            new Hint([0, 1, 2, 4], 1).equals(new Hint([3, 2, 1, 0], 1)).should.be.false();
        });

    })

    describe("isValid", function () {

        it("works", function () {
            new Hint([0, 1, 2, 3], 0, 2).isValid().should.be.true();
            new Hint([0, 1, 2, 3], -10, 0).isValid().should.be.true();

            new Hint([0, 1, 2, 3], 3, 2).isValid().should.be.false();
            new Hint([0, 1, 2, 3], 5).isValid().should.be.false();
        });

    });

    describe("areaCrossing", function () {

        it("works", function () {
            Hint.areaCrossing([0, 1, 2, 3], [1, 2, 3, 4]).should.be.true();
            Hint.areaCrossing([3, 4, 5], [1, 2, 3]).should.be.true();
            Hint.areaCrossing([0, 2, 4], [1, 3, 5]).should.be.false();
        });

    });

    describe("areaCombine", function () {

        it("works", function () {
            Hint.areaCombine([1, 3, 5], [0, 2, 4]).should.eql([0, 1, 2, 3, 4, 5]);
            Hint.areaCombine([3, 5, 8], [2, 3, 4, 8, 9]).should.eql([2, 3, 4, 5, 8, 9]);
            Hint.areaCombine([2, 3, 4, 8, 9], [3, 5, 8]).should.eql([2, 3, 4, 5, 8, 9]);
            Hint.areaCombine([], [1, 2, 3]).should.eql([1, 2, 3]);
            Hint.areaCombine([1, 2, 3], []).should.eql([1, 2, 3]);
        });

    });

    describe("areaInterSection", function () {

        it("works", function () {
            Hint.areaIntersection([0, 1, 2, 3], [1, 2, 3, 4]).should.eql([1, 2, 3]);
            Hint.areaIntersection([3, 4, 5], [1, 2, 3]).should.eql([3]);
        });

        it("returns null when two areas have no common area", function () {
            should(Hint.areaIntersection([0, 2, 4], [1, 3, 5])).be.null();
        });

    });

    describe("areaDifference", function () {

        it("works", function () {
            Hint.areaDifference([2, 3, 5, 7], [0, 1, 3, 7]).should.eql([2, 5]);
            Hint.areaDifference([1, 2, 3], [2]).should.eql([1, 3]);
        });

        it("returns null when difference set is empty", function () {
            should(Hint.areaDifference([2, 4], [1, 2, 4])).be.null();
        });

    });

    describe("solve", function () {

        it("works", function () {
            const a = Hint.solve(new Hint([0, 1, 2, 3], 2, 4), new Hint([2, 3, 4, 5], 3));
            a.newHints[0].equals(new Hint([2, 3], 1, 2)).should.be.true();
            a.newHints[1].equals(new Hint([0, 1], 0, 2)).should.be.true();
            should(a.newHints[2]).be.undefined();
            a.hint1removable.should.be.false();
            a.hint2removable.should.be.false();

            const b = Hint.solve(new Hint([0, 1, 2], 1), new Hint([1, 2, 3], 2, 3));
            b.newHints[0].equals(new Hint([1, 2], 1)).should.be.true();
            b.newHints[1].equals(new Hint([0], 0)).should.be.true();
            b.newHints[2].equals(new Hint([3], 1)).should.be.true();
            b.hint1removable.should.be.true();
            b.hint2removable.should.be.true();
        });

        it("works when one area contains anothoer", function () {
            const a = Hint.solve(new Hint([0, 1, 2, 3], 2), new Hint([1, 2], 1, 2));
            a.newHints[0].equals(new Hint([0, 3], 0, 1)).should.be.true();
            should(a.newHints[1]).be.undefined();
            should(a.newHints[2]).be.undefined();
            a.hint1removable.should.be.false();
            a.hint2removable.should.be.false();

            const b = Hint.solve(new Hint([2, 3], 0, 1), new Hint([0, 1, 2, 3], 3));
            b.newHints[0].equals(new Hint([2, 3], 1)).should.be.true();
            b.newHints[1].equals(new Hint([0, 1], 2)).should.be.true();
            should(b.newHints[2]).be.undefined();
            b.hint1removable.should.be.true();
            b.hint2removable.should.be.true();

            const c = Hint.solve(new Hint([1, 2], 0, 1), new Hint([0, 1, 2], 1));
            c.newHints.length.should.eql(0);
            c.hint1removable.should.be.true();
            c.hint2removable.should.be.false();
        });

        it("keeps hint area", function () {
            const a = Hint.solve(new Hint([1], 1), new Hint([0, 1], 1, 2));
            a.newHints[0].equals(new Hint([0], 0, 1)).should.be.true();
            a.newHints.length.should.be.eql(1);
            a.hint1removable.should.be.false();
            a.hint2removable.should.be.true();
        });

        it("returns null when no information is found", function () {
            should(Hint.solve(new Hint([0, 1, 2], 1), new Hint([3, 4, 5], 2))).be.null();
            should(Hint.solve(new Hint([0, 1, 2], 1), new Hint([2, 3, 4], 2))).be.null();
        });

    });

});
