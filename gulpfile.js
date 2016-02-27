// Load gulp plugins with 'require' function of nodejs
// --------------------------------------------------------

var gulp             = require('gulp'),
    plumber          = require('gulp-plumber'),
    del              = require('del'),
    imagemin         = require('gulp-imagemin'),
    changed          = require('gulp-changed'),
    svgSprite        = require('gulp-svg-sprite'),
    jade             = require('gulp-jade'),
    stylus           = require('gulp-stylus'),
    autoprefixer     = require('gulp-autoprefixer'),
    cssshrink        = require('gulp-cssshrink'),
    nib              = require('nib'),
    rupture          = require('rupture'),
    poststylus       = require('poststylus'),
    lost             = require('lost'),
    concat           = require('gulp-concat'),
    uglify           = require('gulp-uglify'),
    browserSync      = require('browser-sync').create(),
    reload           = browserSync.reload,
    watch            = require('gulp-watch'),
    gzip             = require('gulp-gzip'),
    compress         = require('compression'),
    middleware       = require('connect-gzip-static')('./src/dist/');

// --------------------------------------------------------



// Path configs
// --------------------------------------------------------

var path = {
  app : {
    fonts: 'src/app/fonts/**/*.*',
    initial_img: 'src/app/img/initial/**/*.*',
    compressed_img: 'src/app/img/compressed/',
    del_compressed_img: 'src/app/img/compressed/*',
    compressed_img_bkg: 'src/app/img/compressed/bkg/**/*.*',
    minified_svg: 'src/app/img/compressed/ico/**/*.svg',
    sprite_svg: 'src/app/stylus/partials/',
    del_sprite_partials: 'src/app/stylus/partials/sprite/*',
    sprite_svg_img: 'src/app/stylus/partials/sprite/svg-sprite.svg',
    jade: 'src/app/jade/*.jade',
    stylus: 'src/app/stylus/*.styl',
    del_styl: 'src/app/stylus/partials/*sprite.styl',
    jquery: 'src/app/js/jslibs/jquery-2.2.1.min.js',
    js: 'src/app/js/app.js',
    watch_stylus: 'src/app/stylus/**/*.styl'
  },

  dist: {
    del: 'src/dist/*',
    fonts: 'src/dist/fonts/',
    bkg_img: 'src/dist/css/bkg',
    svg_sprite: 'src/dist/css/sprite/',
    minified_html: 'src/dist/',
    css: 'src/dist/css/',
    js: 'src/dist/js/'
  }
};

// --------------------------------------------------------



// Set Functions for tasks
// --------------------------------------------------------

var gzip_opts = {
  append: false,
  extension: 'gz',
  gzipOptions: { level: 9 }
};

function emptyFolders() {
  return del([
    path.app.del_compressed_img,
    path.app.del_sprite_partials,
    path.app.del_styl,
    path.dist.del
    ]);
}

function copyFonts() {
  return gulp.src(path.app.fonts)
    .pipe(plumber())
    .pipe(gulp.dest(path.dist.fonts))
    .pipe(reload({stream: true}));
}

// Define img compression opts
imagemin_opts = {
  optimizationLevel: 1,
  progressive: true
};

function minifyImg() {
  return gulp.src(path.app.initial_img)
    .pipe(plumber())
    .pipe(changed(path.app.compressed_img))
    .pipe(imagemin(imagemin_opts))
    .pipe(gulp.dest(path.app.compressed_img))
    .on('end', function() {
      return gulp.src(path.app.compressed_img_bkg)
        .pipe(gulp.dest(path.dist.bkg_img));
    });
}

// Define svg spriting opts
// Refactored SVG template - '../node-modules/svg-sprite/tmpl/css/sprite.styl'
// Each separate initial svg after spriting has output as jade element 'i'
// with a common and specific svg class with proper css props :
// i.svg-common.{{initial_svg_filename}}
svgSpriteConfig     = {
  mode            : {
    sprite1     : {
        mode    : 'css',
        render  : {
          styl: {dest: './svg-sprite.styl'}
        },
        dest: './',
        sprite : 'sprite/svg-sprite.svg',
        // Set 'bust' to true - Add a content based hash to the name of the sprite file so that 
        // clients reliably reload the sprite when it's content changes («cache busting»).
        //  Defaults to false except for «css» and «view» sprites.
        bust: false,
        common: 'svg-common'
    }
  }
};

function createSpriteSvg() {
  return gulp.src(path.app.minified_svg)
    .pipe(plumber())
    .pipe(svgSprite(svgSpriteConfig))
    .pipe(imagemin(imagemin_opts))
    .pipe(gulp.dest(path.app.sprite_svg))
    .on('end', function() {
      return gulp.src(path.app.sprite_svg_img)
        // .pipe(gzip(gzip_opts))
        .pipe(gulp.dest(path.dist.svg_sprite));
    });
}

function compileJade() {
  gulp.src(path.app.jade)
    .pipe(plumber())
    .pipe(jade())
    .pipe(gzip(gzip_opts))
    .pipe(gulp.dest(path.dist.minified_html))
    .pipe(reload({stream: true}));
}

function compileStylus() {
  return gulp.src(path.app.stylus)
    .pipe(plumber())
    .pipe(stylus({
      'include css': true,
      use: [
        nib(),
        // Set readable media-rules as block mixins in styles.styl
        rupture(),
        // Add a responsive grid 'lost'
        poststylus(['lost'])
      ],
      import: [
        'nib'
      ]
    }))
    .pipe(autoprefixer()) 
    .pipe(cssshrink())
    .pipe(gzip(gzip_opts))
    .pipe(gulp.dest(path.dist.css))
    .pipe(reload({stream: true}));
}

function compileJS() {
  return gulp.src([
    path.app.jquery,
    path.app.js
    ])
    .pipe(concat('app.js', {newLine: ';'}))
    .pipe(uglify())
    .pipe(gzip(gzip_opts))
    .pipe(gulp.dest(path.dist.js))
    .pipe(reload({stream: true}));
}

// --------------------------------------------------------



// Set Gulp tasks
// --------------------------------------------------------

// Empty folders before build
gulp.task('emptyFolders', function () {
  return emptyFolders();
});

// Copy fonts from app to dist
gulp.task('copyFonts', ['emptyFolders'], function() {
  return copyFonts();
});

// Compress jpg & png
gulp.task('minifyImg', ['emptyFolders'], function() {
  return minifyImg();
});

// Create sprite from minified svg
gulp.task('createSpriteSvg', ['minifyImg'], function() {
  return createSpriteSvg();
});

// Compile Jade
gulp.task('compileJade', ['emptyFolders'], function() {
  return compileJade();
});

// Compile stylus
gulp.task('compileStylus', ['createSpriteSvg'], function() {
  return compileStylus();
});

// Compile js
gulp.task('compileJS', ['emptyFolders'], function() {
  return compileJS();
});

// --------------------------------------------------------



// Build project
// --------------------------------------------------------
gulp.task('build', [
  'emptyFolders',
  'copyFonts',
  'minifyImg',
  'createSpriteSvg',
  'compileJade',
  'compileStylus',
  'compileJS',
]);
// --------------------------------------------------------



// Config for devServer
var serverConfig = {
  server: {
    baseDir: "src/dist/",
    // Comment LoC 257 for non-gzip build.
    middleware: [compress()]
    // Uncomment LoC 259 - 262 for non-gzip build.
    // middleware: function (req, res, next) {
    //   res.setHeader('Access-Control-Allow-Origin', '*');
    //   next();
    // }
  },
  files: ['src/dist/*.html', 'src/dist/css/*.css', 'src/dist/css/sprite/*.svg', 'src/dist/js/*.js'],
  tunnel: false,
  host: 'localhost',
  port: 3000,
  logPrefix: "Vaan_logprefix",
  open: true,
  injectChanges: true
};

gulp.task('webserver', ['build'], function () {
  // Uncomment LoC 275 for non-gzip build.
  // browserSync.init(serverConfig);

  // Comment LoC 278 - 285 for non-gzip build.
  browserSync.init(
    serverConfig,
    function (err, bs) {
      bs.addMiddleware("*", middleware, {
        override: true
      });
    }
  );
});




// Watch changes & livereload
// --------------------------------------------------------

gulp.task('watch', ['webserver'], function() {

  watch(path.app.fonts, function() {
    return copyFonts();
  });
  
  watch(path.app.initial_img, function() {
    return minifyImg();
  });

  watch(path.app.minified_svg, function() {
    return createSpriteSvg();
  });

  watch(path.app.jade, function() {
    return compileJade();
  });

  watch(path.app.watch_stylus, function() {
    return compileStylus();
  });
  
  watch(path.app.js, function() {
    return compileJS();
  });

});

// --------------------------------------------------------
