/*
 * gulp-bootlint
 * https://github.com/tschortsch/gulp-bootlint
 *
 * Copyright (c) 2014 Juerg Hunziker
 * Licensed under the MIT license.
 */

'use strict';
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var through = require('through2');
var chalk = require('chalk');
var bootlint = require('bootlint');

// consts
var PLUGIN_NAME = 'gulp-bootlint';

var logLevel = {
    DEBUG : 1,
    INFO : 2,
    ERROR : 3,
    NONE : 4
};

function gulpBootlint(options) {
    options = options || {
        disabledIds: [],
        logLevel : 'INFO'
    };

    if (options.logLevel){
        options.logLevel = options.logLevel.toUpperCase();
    }
    options.logLevel = logLevel[options.logLevel] || logLevel.INFO;

    var hasError = false;

    // creating a stream through which each file will pass
    var stream = through.obj(function (file, enc, cb) {
        var errorCount = 0;

        if (file.isNull()) {
            return cb(null, file);
        }

        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
            return cb();
        }

        var reporter = function (lint) {
            var lintId = (lint.id[0] === 'E') ? chalk.bgRed.white(lint.id) : chalk.bgYellow.white(lint.id),
                errorElementsAvailable = false;

            if (lint.elements) {
                lint.elements.each(function (_, element) {
                    var errorLocation = element.startLocation;
                    log.error(file.path + ":" + (errorLocation.line + 1) + ":" + (errorLocation.column + 1), lintId, lint.message);
                    errorElementsAvailable = true;
                });
            }
            if (!errorElementsAvailable) {
                log.error(file.path + ":", lintId, lint.message);
            }

            ++errorCount;
            hasError = true;
            file.bootlint.success = false;
            file.bootlint.issues.push(lint);
        };

        log.debug(chalk.gray('Linting file ' + file.path));
        file.bootlint = { success: true, issues: [] };
        bootlint.lintHtml(file.contents.toString(), reporter, options.disabledIds);

        if(errorCount > 0) {
            log.error(chalk.red(errorCount + ' lint error(s) found in file ' + file.path));
        } else {
            log.info(chalk.green(file.path + ' is lint free!'));
        }

        return cb(null, file);
    }, function(cb) {
        if(hasError) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Lint errors found!'));
        }

        return cb();
    });

    var log = {
        log : function(){
            gutil.log.apply(this, arguments);
        },
        debug : function(){
            if (options.logLevel <= logLevel.DEBUG){
                this.log.apply(this, arguments);
            }
        },
        info : function(){
            if (options.logLevel <= logLevel.INFO){
                this.log.apply(this, arguments);
            }
        },
        error : function(){
            if (options.logLevel <= logLevel.ERROR){
                this.log.apply(this, arguments);
            }
        }
    };

    return stream;
};

// exporting the plugin
module.exports = gulpBootlint;