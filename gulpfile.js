'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var autoprefixer = require('gulp-autoprefixer');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var prettify = require('gulp-prettify');
var exec = require('child_process').exec;
var runSequence = require('run-sequence');
var awsPublish = require('gulp-awspublish');
var awsPublishRouter = require('gulp-awspublish-router');

var CSS_DEST = 'public/css/';
var HTML_DEST = 'public/html/';

/*
 * Combine and minify CSS
 */
gulp.task('css', function() {
  var cssFiles = ['node_modules/normalize.css/normalize.css', 'theme/css/text.css', 'theme/css/structure.css'];

  return gulp.src(cssFiles)
    .pipe(autoprefixer('last 1 version'))
    .pipe(concat('style.min.css'))
    .pipe(minifyCss())
    .pipe(rename('style.css'))
    .pipe(gulp.dest(CSS_DEST));
});

/*
 * Minify HTML
 */
gulp.task('html', function() {
  return gulp.src('public/**/*.html')
    .pipe(prettify({preserve_newlines: false, wrap_attributes:false}))
    .pipe(gulp.dest('public/'));
});

/*
 * Move images to public dir
 */
gulp.task('images', function() {
    return gulp.src('images/**/*')
        .pipe(gulp.dest('public/images/'));
});

/*
 * Watch for changes
 */
gulp.task('watch', function () {
  gulp.watch('theme/css/**/*.css', ['css']);
  gulp.watch('public/**/*.html', ['html']);
});

/*
 * Run hugo as a server
 */
gulp.task('hugoserver', function(fetch) {
    var hugo = exec('hugo server --watch --buildDrafts');
    hugo.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });
});

/*
 * Run hugo
 */
gulp.task('hugo', function() {
    var hugo = exec('hugo', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
  });
});

/*
 * Publish command
 */
gulp.task('aws-publish', ['build'], function () {

    var publisher = awsPublish.create(JSON.parse(fs.readFileSync(process.env.HOME + '/.aws/'  + process.env.site + '.json')));

    return gulp.src('./dist/**')
        .pipe(awsPublishRouter({
            cache: {
                // cache for 5 minutes by default
                cacheTime: 300
            },

            routes: {
                "^assets/(?:.+)\\.(?:js|css|svg|ttf)$": {
                    // don't modify original key. this is the default
                    key: "$&",
                    // use gzip for assets that benefit from it
                    gzip: true,
                    // cache static assets for 20 years
                    cacheTime: 630720000
                },

                "^assets/.+$": {
                    // cache static assets for 20 years
                    cacheTime: 630720000
                },

                "^.+\\.html": {
                    gzip: true
                },

                "^README$": {
                    // specify extra headers
                    headers: {
                        "Content-Type": "text/plain"
                    }
                },

                // pass-through for anything that wasn't matched by routes above, to be uploaded with default options
                "^.+$": "$&"
            }
        }))
        .pipe(parallelize(publisher.publish(), 10))
        .pipe(publisher.sync())
        .pipe(publisher.cache())
        .pipe(awspublish.reporter({
            states: ['create', 'update', 'delete']
        }));
});

/*
 * Default command
 */
gulp.task('default', [], function () {
  gulp.start('css');
  gulp.start('images');

  gulp.start('hugo');
  gulp.start('watch');

});

gulp.task('build', function (callback) {
  runSequence(
    'css',
    'images',
    'hugo',
    'html',
    function (error) {
      if (error) {
        console.log(error.message);
      } else {
        console.log('BUILD FINISHED SUCCESSFULLY');
      }
      callback(error);
    });
});
