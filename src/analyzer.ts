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

    isValid() { return this._valid; }

    clone() {
        const analyzer = new Analyzer();
        analyzer._hints = this._hints.map(hint => hint.clone());
        analyzer._valid = this._valid;
        analyzer._probabilityMap = this._probabilityMap;
        analyzer._removedHints = this._removedHints.map(hint => hint.clone());
        analyzer._coveredArea = [...this._coveredArea];
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
    private _addHint(hint: Hint): boolean {
        if (!this._valid) return false;
        if (hint.breadth === 0) return true;
        for (let existedHint of this._hints) {
            if (Hint.areaInclude(hint.area, existedHint.area)) {
                const partMin = existedHint.partMin(hint.breadth);
                const partMax = existedHint.partMax(hint.breadth);
                if (hint.min <= partMin && partMax <= hint.max) return true;
                const newMin = Math.max(hint.min, partMin);
                const newMax = Math.min(hint.max, partMax);
                hint = new Hint(hint.area, newMin, newMax);
            }
        }
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
        const addHintsList = [] as Hint[]; // 追加予約リスト
        let notPushNewHint = false;
        for (let i = 0; i < this._hints.length; i++) {
            const existedHint = this._hints[i];
            const resolveResult = Hint.solve(hint, existedHint);
            if (!resolveResult) continue;
            addHintsList.push(...resolveResult.newHints);
            if (resolveResult.hint2removable) this._removedHints.push(this._hints.splice(i--, 1)[0]);
            if (resolveResult.hint1removable) {
                // newHintが不要と判断されたらこのループは中止
                notPushNewHint = true;
                break;
            }
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

        if (restArea) dividedHints.push([new Hint(restArea, 0, restArea.length)]);

        return dividedHints;
    }

    // 地雷数別確率Mapを求める
    private _calculateProbabilityMap(): ProbabilityMap {
        if (!this._valid) return [];

        // 各エリアごとにProbabilityMapを算出
        const dividedHints = this._classifyHints();
        const areaProbabilityMaps = [] as ProbabilityMap[];
        for (let i = 2, l = dividedHints.length; i < l; i++) {
            const hints = dividedHints[i];
            const areaProbabilityMap = [] as ProbabilityMap;
            areaProbabilityMaps.push(areaProbabilityMap);

            // 単一ヒントの場合はAnalyzerを用いずに直接ProbabilityMapを生成する
            if (hints.length === 1) {
                const hint = hints[0];
                for (let minesNumber = hint.min; minesNumber <= hint.max; minesNumber++) {
                    const map = {} as ProbabilityMapPart["map"];
                    for (let position of hint.area) map[position] = minesNumber / hint.breadth;
                    attachProbabilityMapPart(areaProbabilityMap, { minesNumber, patternsNumber: binomial(hint.breadth, minesNumber), map });
                }
                continue;
            }

            // 場合分け
            const patterns = [] as (Hint | Hint[])[]; // ここに各パターンに対応するhintを格納する

            // hintが占有する領域の広さ
            const singleHintAreaBreadth = [] as number[];
            for (let i = 0, l = hints.length; i < l; i++) singleHintAreaBreadth[i] = 0;
            // このマスについての情報を含むhintが1つだけの場合, そのhintのインデックス
            const singleHintPositionMap = {} as Record<number, number | undefined>;
            // このマスについての情報を含むhintの数
            const positionHintsNumbersMap = {} as Record<number, number>;
            for (let i = 0, l = hints.length; i < l; i++) {
                for (let position of hints[i].area) {
                    if (positionHintsNumbersMap[position] === undefined) {
                        // このpositionに来た初回
                        singleHintAreaBreadth[i]++;
                        singleHintPositionMap[position] = i;
                        positionHintsNumbersMap[position] = 1;
                    } else if (positionHintsNumbersMap[position] === 1) {
                        // 2回目
                        singleHintAreaBreadth[singleHintPositionMap[position]!]--;
                        delete singleHintPositionMap[position];
                        positionHintsNumbersMap[position]++;
                    } else {
                        // 3回目以降
                        positionHintsNumbersMap[position]++;
                    }
                }
            }

            // 占有領域が最も広いhintを求める
            let keyHintIndex: number | null = null;
            let maxSingleHintAreaBreadth = 0;
            for (let i = 0, l = hints.length; i < l; i++) {
                if (singleHintAreaBreadth[i] > maxSingleHintAreaBreadth) {
                    keyHintIndex = i;
                    maxSingleHintAreaBreadth = singleHintAreaBreadth[i];
                }
            }

            if (keyHintIndex !== null) {
                const keyHint = hints[keyHintIndex]; // 占有領域が最も広いhint
                const keyArea = [] as number[];
                for (let position in singleHintPositionMap) {
                    if (singleHintPositionMap[position] === keyHintIndex) keyArea.push(Number(position));
                }
                // 占有領域内の地雷数で場合分け
                const minesMin = keyHint.partMin(maxSingleHintAreaBreadth);
                const minesMax = keyHint.partMax(maxSingleHintAreaBreadth);
                for (let i = minesMin; i <= minesMax; i++) {
                    patterns.push(new Hint(keyArea, i));
                }
            } else {

                // ある領域内の地雷数で場合分け
                let keyHint: Hint | null = null;
                for (let hint of hints) {
                    if (hint.min !== hint.max) {
                        if (!keyHint || hint.max - hint.min > keyHint.max - keyHint.min ||
                            (hint.max - hint.min === keyHint.max - keyHint.min && hint.breadth < keyHint.breadth)) {
                            keyHint = hint;
                        }
                    }
                }
                if (keyHint) {
                    for (let i = keyHint.min; i <= keyHint.max; i++) {
                        patterns.push(new Hint(keyHint.area, i));
                    }
                } else {

                    // 最も多くのhintに含まれる1マスの地雷の有無で場合分け
                    // let keyPosition = 0, maxHintsNumber = -Infinity;
                    // for (let position in positionHintsNumbersMap) {
                    //     const hintsNumber = positionHintsNumbersMap[position];
                    //     if (hintsNumber > maxHintsNumber) {
                    //         keyPosition = Number(position);
                    //         maxHintsNumber = hintsNumber;
                    //     }
                    // }

                    // 最小サイズのhintから崩す
                    let keyHint = hints[0];
                    for (let hint of hints) if (hint.breadth < keyHint.breadth) keyHint = hint;
                    const keyPosition = keyHint.area[0];

                    patterns.push(
                        new Hint([keyPosition], 0),
                        new Hint([keyPosition], 1),
                    );
                }
            }

            // 全ての場合についてProbabilityMapを算出し統合
            for (let pattern of patterns) {
                const analyzer = new Analyzer();
                analyzer._hints.push(...hints);
                if (pattern instanceof Hint) {
                    analyzer._addHint(pattern);
                } else {
                    for (let hint of pattern) analyzer._addHint(hint);
                }
                for (let part of analyzer._calculateProbabilityMap()) attachProbabilityMapPart(areaProbabilityMap, part);
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
        for (let part of this._probabilityMap) {
            if (part.minesNumber === minesNumber) return { ...part.map };
        }
        return null;
    }
    getPatternsNumber(minesNumber: number) {
        if (!this._valid) return 0;
        this._probabilityMap = this._probabilityMap || this._calculateProbabilityMap();
        for (let part of this._probabilityMap) {
            if (part.minesNumber === minesNumber) return part.patternsNumber;
        }
        return 0;
    }
}

export = Analyzer;
