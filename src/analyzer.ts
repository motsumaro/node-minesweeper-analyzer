import Hint from "./hint";

function cartesianProduct<T extends any[]>(...x: { [K in keyof T]: T[K][] }): T[] {
    if (x.length === 0) return [[]] as any;
    const result = [] as any[];
    const latters = cartesianProduct(...x.slice(1));
    for (let first of x[0]) {
        for (let latter of latters) {
            result.push([first, ...latter]);
        }
    }
    return result;
}

interface ProbabilityMapPart {
    minesNumber: number;
    patternsNumber: number;
    map: Record<number, number>;
}
type ProbabilityMap = ProbabilityMapPart[];

// ProbabilityMapにProbabilityMapPartを統合する
function attachProbabilityMapPart(map: ProbabilityMap, part: ProbabilityMapPart) {
    // 既存のpartと地雷数が一致すればそこに統合
    for (let existingPart of map) {
        if (existingPart.minesNumber === part.minesNumber) {
            existingPart.patternsNumber += part.patternsNumber;
            const k = part.patternsNumber / existingPart.patternsNumber; // 確率は重み付きで結合
            for (let position in existingPart.map)
                existingPart.map[position] = (1 - k) * existingPart.map[position] + k * (part.map[position] || 0);
            for (let position in part.map)
                if (!(position in existingPart.map)) existingPart.map[position] = k * part.map[position];
            return;
        } else if (existingPart.minesNumber > part.minesNumber) {
            break;
        }
    }

    // 無ければ追加(mapはminesNumber順)
    const l = map.length;
    let target = 0;
    while (target < l && map[target].minesNumber < part.minesNumber) target++;
    for (let i = l - 1; i >= target; i--) map[i + 1] = map[i];
    map[target] = part;
}

function binomial(n: number, r: number): number {
    r = Math.min(r, n - r);
    if (r < 0) return 0;
    let x = 1;
    for (let i = 0; i < r; i++) {
        x *= n - r + 1 + i;
        x /= i + 1;
    }
    return x;
}

class Analyzer {
    private _hints = [] as Hint[];
    private _valid = true;
    private _probabilityMap: ProbabilityMap | null = null;
    private _removedHints = [] as Hint[];
    private _coveredArea = [] as number[];
    private _wholeAreaHint: Hint | null = null;

    isValid() { return this._valid; }

    clone() {
        const analyzer = new Analyzer();
        analyzer._hints = this._hints.map(hint => hint.clone());
        analyzer._valid = this._valid;
        analyzer._probabilityMap = this._probabilityMap;
        analyzer._removedHints = this._removedHints.map(hint => hint.clone());
        analyzer._coveredArea = [...this._coveredArea];
        analyzer._wholeAreaHint = this._wholeAreaHint && this._wholeAreaHint.clone();
        return analyzer;
    }

    // 新たな情報を追加し整理する（戻り値:情報の整合性が保たれているか）
    add(area: number[], min: number, max = min): boolean {
        return this._addHint(new Hint(area, min, max));
    }
    addR(area_from: number, area_to: number, min: number, max = min) {
        // 連番領域
        if (!isFinite(area_from) || !isFinite(area_to)) throw new Error("Invalid area range");
        const area = [] as number[];
        if (area_from < area_to) {
            for (let i = area_from; i <= area_to; i++) area.push(i);
        } else {
            for (let i = area_from; i >= area_to; i--) area.push(i);
        }
        return this._addHint(new Hint(area, min, max));
    }
    private _addHint(hint: Hint, noCheckWholeArea = false): boolean {
        if (!this._valid) return false;
        if (hint.breadth === 0) return true;
        if (!hint.isValid()) {
            this._hints.push(hint);
            return this._valid = false;
        }
        for (let removedHint of this._removedHints) if (hint.equals(removedHint)) return true;

        // 空地確定、地雷確定の領域の情報は1マスごとに分割
        if (hint.breadth > 1 && hint.min === 0 && hint.max === 0) {
            for (let position of hint.area) {
                if (!this._addHint(new Hint([position], 0))) return false;
            }
            return true;
        } else if (hint.breadth > 1 && hint.min === hint.breadth && hint.max === hint.breadth) {
            for (let position of hint.area) {
                if (!this._addHint(new Hint([position], 1))) return false;
            }
            return true;
        }

        this._probabilityMap = null; // キャッシュを削除

        // 既存のhintと合成する

        if (!noCheckWholeArea) {
            if (this._hints.length >= 2) {
                // 他の全てのhintの領域を含むhintはwholeAreaHintとして特別扱い
                if (this._wholeAreaHint) {
                    if (hint.breadth > this._wholeAreaHint.breadth && Hint.areaInclude(this._wholeAreaHint.area, hint.area)) {
                        // 交代
                        const old = this._wholeAreaHint;
                        this._wholeAreaHint = hint;
                        Hint.areaCombine(this._coveredArea, hint.area);
                        return this._addHint(old);
                    } else if (!Hint.areaInclude(hint.area, this._wholeAreaHint.area)) {
                        // wholeArea条件を満たさなくなったため普通のhintに降格
                        const old = this._wholeAreaHint;
                        this._wholeAreaHint = null;
                        if (!this._addHint(old)) return false;
                    }
                } else {
                    let canBeWholeAreaHint = true;
                    for (let existedHint of this._hints) {
                        if (!Hint.areaInclude(existedHint.area, hint.area)) {
                            canBeWholeAreaHint = false;
                            break;
                        }
                    }
                    if (canBeWholeAreaHint) {
                        this._wholeAreaHint = hint;
                        Hint.areaCombine(this._coveredArea, hint.area);
                        return true;
                    }
                }
            } else if (this._hints.length === 1) {
                const existedHint = this._hints[0];
                if (Hint.areaInclude(existedHint.area, hint.area)) {
                    this._wholeAreaHint = hint;
                    Hint.areaCombine(this._coveredArea, hint.area);
                    return true;
                } else if (Hint.areaInclude(hint.area, existedHint.area)) {
                    this._wholeAreaHint = existedHint;
                    this._hints[0] = hint;
                    return true;
                }
            }
        }

        const addHintsList = [] as Hint[]; // 追加予約リスト
        let notPushNewHint = false;
        for (let i = 0; i < this._hints.length; i++) {
            const existedHint = this._hints[i];
            const resolveResult = Hint.solve(hint, existedHint);
            if (!resolveResult) continue;
            if (!notPushNewHint) addHintsList.push(...resolveResult.newHints);
            if (resolveResult.hint2removable) this._removedHints.push(this._hints.splice(i--, 1)[0]);
            if (resolveResult.hint1removable) notPushNewHint = true;
        }
        Hint.areaCombine(this._coveredArea, hint.area);
        if (notPushNewHint) this._removedHints.push(hint); else this._hints.push(hint);
        for (let addHint of addHintsList) if (!this._addHint(addHint)) return false;

        return true;
    }

    // 現在のhintを[空地確定,地雷確定,独立領域1,独立領域2...]の形に分類する
    private _classifyHints(): Hint[][] {
        const dividedHints = [[], []] as Hint[][]; // 0と1は確定hint
        const dividedAreas = [0 as any, 0 as any] as number[][];
        let dividedLength = 2;
        let restArea: number[] | null = [...this._coveredArea];

        // 仮分割
        loop_hint:
        for (let hint of this._hints) {
            if (restArea) restArea = Hint.areaDifference(restArea, hint.area);

            // 確定マス
            if (hint.breadth === 1 && hint.min === hint.max) {
                dividedHints[hint.min /* 0 or 1 */].push(hint);
                continue;
            }

            // 既存の仮分割領域との交差判定
            for (let i = 2; i < dividedLength; i++) {
                if (Hint.areaCrossing(hint.area, dividedAreas[i])) {
                    dividedHints[i].push(hint);
                    Hint.areaCombine(dividedAreas[i], hint.area);
                    continue loop_hint;
                }
            }

            // 新たな仮分割領域を生成
            dividedHints.push([hint]);
            dividedAreas.push([...hint.area]);
            dividedLength++;
        }

        // 仮分割領域を統合
        for (let i = 2; i < dividedLength - 1; i++) {
            for (let j = i + 1; j < dividedLength; j++) {
                if (Hint.areaCrossing(dividedAreas[i], dividedAreas[j])) {
                    dividedHints[i].push(...dividedHints[j]);
                    Hint.areaCombine(dividedAreas[i], dividedAreas[j]);
                    dividedHints.splice(j, 1);
                    dividedAreas.splice(j, 1);
                    j = i + 1; // 統合したことで一度飛ばした領域と交差する可能性があるため再走査
                    dividedLength--;
                }
            }
        }

        if (restArea && !this._wholeAreaHint) dividedHints.push([new Hint(restArea, 0, restArea.length)]);

        return dividedHints;
    }

    // 地雷数別確率Mapを求める
    private _calculateProbabilityMap(depth = 0): ProbabilityMap {
        if (!this._valid) return [];

        // 各エリアごとにProbabilityMapを算出
        const dividedHints = this._classifyHints();
        const areaProbabilityMaps = [] as ProbabilityMap[];
        for (let i = 2, l = dividedHints.length; i < l; i++) {
            const hints = dividedHints[i];
            const areaProbabilityMap = [] as ProbabilityMap;
            areaProbabilityMaps.push(areaProbabilityMap);

            if (hints.length === 1) {
                // 単一ヒントの場合はAnalyzerを用いずに直接ProbabilityMapを生成する
                const hint = hints[0];
                for (let minesNumber = hint.min; minesNumber <= hint.max; minesNumber++) {
                    const map = {} as ProbabilityMapPart["map"];
                    for (let position of hint.area) map[position] = minesNumber / hint.breadth;
                    attachProbabilityMapPart(areaProbabilityMap, { minesNumber, patternsNumber: binomial(hint.breadth, minesNumber), map });
                }
            } else {
                // 最も領域が広いhint
                let widestHint = hints[0];
                for (let hint of hints) if (hint.breadth > widestHint.breadth) widestHint = hint;

                // widestHintと交差する別のhint
                let crossHint = hints[0];
                let intersection: number[] = undefined as any;
                for (let hint of hints) {
                    if (hint === widestHint) continue;
                    const intersection_ = Hint.areaIntersection(widestHint.area, hint.area);
                    if (intersection_) {
                        crossHint = hint;
                        intersection = intersection_;
                        break;
                    }
                }

                // intersectionまたはdifferenceの狭いほうの地雷数を仮定する→次ループでhintが1つ減る
                const difference = Hint.areaDifference(crossHint.area, intersection);
                let keyArea: number[];
                let keyAreaMax: number;
                let keyAreaMin: number;
                if (difference === null) {
                    // crossHint.areaがwidestHint.areaに含まれている場合
                    keyArea = intersection.length < widestHint.breadth / 2 ?
                        intersection : Hint.areaDifference(widestHint.area, intersection)!;
                    keyAreaMin = widestHint.partMin(keyArea.length);
                    keyAreaMax = widestHint.partMax(keyArea.length);
                } else {
                    keyArea = intersection.length < difference.length ? intersection : difference;
                    keyAreaMin = crossHint.partMin(keyArea.length);
                    keyAreaMax = crossHint.partMax(keyArea.length);
                }
                let space = "";
                for (let i = 0; i < depth; i++) space += " ";
                for (let i = keyAreaMin; i <= keyAreaMax; i++) {
                    const analyzer = new Analyzer();
                    analyzer._hints.push(...hints);
                    analyzer._addHint(new Hint(keyArea, i), true); // 場合分けの仮定
                    for (let part of analyzer._calculateProbabilityMap(depth + 1)) attachProbabilityMapPart(areaProbabilityMap, part);
                }
            }
        }

        // 各エリアの地雷数の組み合わせを列挙
        const result = [] as ProbabilityMap;
        for (let selection of cartesianProduct(...areaProbabilityMaps)) {
            let minesNumber = dividedHints[1].length;
            let patternsNumber = 1;
            const map = {} as ProbabilityMapPart["map"];

            for (let hint of dividedHints[0]) map[hint.area[0]] = 0; // 空地確定マス
            for (let hint of dividedHints[1]) map[hint.area[0]] = 1; // 地雷確定マス
            for (let part of selection) {
                minesNumber += part.minesNumber;
                patternsNumber *= part.patternsNumber;
                for (let position in part.map) map[position] = part.map[position];
            }

            attachProbabilityMapPart(result, { minesNumber, patternsNumber, map });
        }

        return result;
    }
    getProbabilityMap(minesNumber: number) {
        if (!this._valid) return null;
        this._probabilityMap = this._probabilityMap || this._calculateProbabilityMap();
        const restArea = this._getRestAreaOnWholeArea();
        if (this._wholeAreaHint && restArea) {
            if (minesNumber < this._wholeAreaHint.min || this._wholeAreaHint.max < minesNumber) return null;

            const result = {} as Record<number, number>;
            for (let position of this._coveredArea) result[position] = 0;

            let totalPatterns = 0;
            for (let part of this._probabilityMap) {
                const partPatterns = part.patternsNumber * binomial(restArea.length, minesNumber - part.minesNumber);
                if (partPatterns === 0) continue;
                
                const partMap = { ...part.map };
                const restProb = (minesNumber - part.minesNumber) / restArea.length;
                for (let position of restArea) partMap[position] = restProb;

                totalPatterns += partPatterns;
                const k = partPatterns / totalPatterns;
                for (let position of this._coveredArea) {
                    result[position] = result[position] * (1 - k) + partMap[position] * k;
                }
            }
            if (totalPatterns === 0) return null;

            return result;
        } else {
            for (let part of this._probabilityMap) {
                if (part.minesNumber === minesNumber) return { ...part.map };
            }
            return null;
        }
    }
    getPatternsNumber(minesNumber: number) {
        if (!this._valid) return 0;
        this._probabilityMap = this._probabilityMap || this._calculateProbabilityMap();
        const restArea = this._getRestAreaOnWholeArea();
        if (this._wholeAreaHint && restArea) {
            if (minesNumber < this._wholeAreaHint.min || this._wholeAreaHint.max < minesNumber) return 0;
            let result = 0;
            for (let part of this._probabilityMap) {
                result += part.patternsNumber * binomial(restArea.length, minesNumber - part.minesNumber);
            }
            return result;
        } else {
            for (let part of this._probabilityMap) {
                if (part.minesNumber === minesNumber) return part.patternsNumber;
            }
            return 0;
        }
    }
    _getRestAreaOnWholeArea() {
        if (!this._wholeAreaHint) return null;
        let result: null | number[] = this._wholeAreaHint.area;
        for (let hint of this._hints) {
            result = Hint.areaDifference(result, hint.area);
            if (!result) return result;
        }
        return result;
    }
}

export = Analyzer;
