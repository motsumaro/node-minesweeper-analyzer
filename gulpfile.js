const gulp = require("gulp");
const cached = require("gulp-cached");

const ts = require("gulp-typescript");
exports.ts = () => {
    return gulp.src("src/**/*.ts")
        .pipe(cached("ts"))
        .pipe(ts("tsconfig.json"))
        .pipe(gulp.dest("lib/"));
};

const mocha = require("gulp-mocha");
exports.mocha = () => {
    return gulp.src(["test/**/*.js", "!test/**/_*.js"])
        .pipe(mocha());
};

exports.default = () => {
    gulp.watch("src/**/*.ts", gulp.parallel("ts"));
    gulp.watch(["lib/**/*.js", "test/**/*.js"], gulp.parallel("mocha"));
};
