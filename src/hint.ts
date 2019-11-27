const compareNumber = (a: number, b: number) => a - b;

// 領域と地雷数の組
class Hint {

    readonly area: number[] // 領域（昇順）
    readonly breadth: number;
    readonly min: number;
    readonly max: number;

    constructor(area: number[], min: number, max = min) {
        const area_ = [] as number[];
        f1:
        for (let position of area) {
            position = Math.floor(position);
            if (!isFinite(position) || position < 0) throw new Error("Invalid position");
            for (let position_ of area_) if (position === position_) continue f1;
            area_.push(position);
        }
        this.area = area_.sort(compareNumber);
        this.breadth = area_.length;

        this.min = Math.max(Math.floor(min), 0);
        if (!isFinite(this.min)) throw new Error("Invalid min");
        this.max = Math.min(Math.floor(max), this.breadth);
        if (!isFinite(this.max)) throw new Error("Invalid max");
    }

    equals(another: Hint) {
        return this.min === another.min && this.max === another.max && Hint.areaEqual(this.area, another.area);
    }

    clone() {
        return new Hint(this.area, this.min, this.max);
    }

    // このHintに合致する地雷の配置パターンが存在するか
    isValid() {
        return this.min <= this.max;
    }

    // area内のある一部分が持ちうる地雷数
    partMin(partBreadth: number) { return Math.max(this.min - (this.breadth - partBreadth), 0); }
    partMax(partBreadth: number) { return Math.min(this.max, partBreadth); }

    // area系メソッドは全てデータが昇順であることが前提

    // areaが等しいか
    static areaEqual(area1: number[], area2: number[]) {
        const l = area1.length;
        if (area2.length !== l) return false;
        for (let i = 0; i < l; i++) if (area1[i] !== area2[i]) return false;
        return true;
    }

    // area1がarea2の部分集合か
    static areaInclude(area1: number[], area2: number[]) {
        let i = 0, j = 0, breadth1 = area1.length, breadth2 = area2.length;
        while (i < breadth1) {
            const a = area1[i], b = area2[j];
            if (j >= breadth2 || a < b) {
                return false;
            } else if (a === b) {
                i++;
                j++;
            } else {
                j++;
            }
        }
        return true;
    }

    // areaが交差するか
    static areaCrossing(area1: number[], area2: number[]) {
        let i = 0, j = 0, breadth1 = area1.length, breadth2 = area2.length;
        while (i < breadth1 && j < breadth2) {
            const a = area1[i], b = area2[j];
            if (a === b) return true; else if (a < b) i++; else j++;
        }
        return false;
    }

    // 和集合（破壊的）
    static areaCombine(area1: number[], area2: number[]) {
        let i = 0, j = 0, breadth1 = area1.length, breadth2 = area2.length;
        while (j < breadth2) {
            const a = area1[i], b = area2[j];
            if (i >= breadth1 || a > b) {
                // area1にbを挿入
                for (let k = breadth1 - 1; k >= i; k--) area1[k + 1] = area1[k];
                area1[i] = b;
                i++;
                breadth1++;
                j++;
            } else if (a === b) {
                i++;
                j++;
            } else {
                i++;
            }
        }
        return area1;
    }

    // 共通部分
    static areaIntersection(area1: number[], area2: number[]) {
        let result: null | number[] = null;
        let i = 0, j = 0, breadth1 = area1.length, breadth2 = area2.length;
        while (i < breadth1 && j < breadth2) {
            const a = area1[i], b = area2[j];
            if (a === b) {
                if (result) result.push(a); else result = [a];
                i++;
                j++;
            } else if (a < b) {
                i++;
            } else {
                j++;
            }
        }
        return result;
    }

    // 差集合
    static areaDifference(area1: number[], area2: number[]) {
        let result: null | number[] = null;
        let i = 0, j = 0, breadth1 = area1.length, breadth2 = area2.length;
        while (i < breadth1) {
            const a = area1[i], b = area2[j];
            if (j >= breadth2 || a < b) {
                if (result) result.push(a); else result = [a];
                i++;
            } else if (a === b) {
                i++;
                j++;
            } else {
                j++;
            }
        }
        return result;
    }

    // 共通部分を持つ2つのhintから新たなhintを生成
    static solve(hint1: Hint, hint2: Hint) {
        const intersection = Hint.areaIntersection(hint1.area, hint2.area);
        if (!intersection) return null;
        const iBreadth = intersection.length;
        const iMax1 = hint1.partMax(iBreadth), iMin1 = hint1.partMin(iBreadth);
        const iMax2 = hint2.partMax(iBreadth), iMin2 = hint2.partMin(iBreadth);
        if (iMax1 === iMax2 && iMin1 === iMin2) {
            // 交差部分はあるが新たな情報が得られない場合
            if (iBreadth === hint2.breadth) return { newHints: [] as Hint[], hint1removable: false, hint2removable: true };
            if (iBreadth === hint1.breadth) return { newHints: [] as Hint[], hint1removable: true, hint2removable: false };
            return null;
        }

        const newHints = [] as Hint[]; // 新たなhint
        let hint1removable = false;
        let hint2removable = false;

        // 交差部分
        const iHint = new Hint(intersection, Math.max(iMin1, iMin2), Math.min(iMax1, iMax2));
        if (iHint.equals(hint1)) {
            if (iHint.min === iHint.max || hint2.breadth === iBreadth) hint2removable = true;
        } else if (iHint.equals(hint2)) {
            if (iHint.min === iHint.max || hint1.breadth === iBreadth) hint1removable = true;
        } else {
            newHints.push(iHint);
            if (iHint.min === iHint.max) hint1removable = hint2removable = true;
            if (iHint.breadth === hint1.breadth) hint1removable = true;
            if (iHint.breadth === hint2.breadth) hint2removable = true;
        }

        // 差部分（新情報の場合のみ）
        if (iMin1 < iHint.min || iHint.max < iMax1) {
            const difference = Hint.areaDifference(hint1.area, intersection);
            if (difference) {
                const dHint = new Hint(difference, hint1.min - iHint.max, hint1.max - iHint.min);
                newHints.push(dHint);
                if (dHint.min === dHint.max) hint1removable = true;
            }
        }
        if (iMin2 < iHint.min || iHint.max < iMax2) {
            const difference = Hint.areaDifference(hint2.area, intersection);
            if (difference) {
                const dHint = new Hint(difference, hint2.min - iHint.max, hint2.max - iHint.min);
                newHints.push(dHint);
                if (dHint.min === dHint.max) hint2removable = true;
            }
        }

        return { newHints, hint1removable, hint2removable }
    }

}

export = Hint;
