/*!
 * Lennon v0.1
 *
 * An extremely lightweight router that uses the History API and falls back to hash.
 *
 * @author Gabe Hayes <gabriel.hayes@gmail.com>
 * @copyright 2013, Gabe Hayes
 */
(function(window, $, Modernizr, undefined) {

    'use strict';

    return window.Lennon = function(opts) {

        var initialized = false,

            options = $.extend({

                //-- determines whether or not the history api is enabled
                historyEnabled: Modernizr.history,

                //-- a jQuery selector for links that will have routing behavior applied to them
                linkSelector: 'a[target!=_blank]:not([href^=http])',

                //-- the logger requires error, info and warn methods
                logger: window.console,

                //-- the publish event that will dispatch the registered event name
                publishEvent: null

            }, opts),

            routes = [],

            updateLinks = function(router) {

                var $internal_links = $(options.linkSelector),
                    processRoute = function() {
                        router.process();
                    };

                //-- Use pushstate on anchor clicks
                if ( options.historyEnabled ) {
                    $internal_links.each(function() {
                        var $this = $(this);
                        if ( !$this.data('lennonized') ) {
                            $this.on('click', function() {
                                window.history.pushState(null, null, $(this).attr('href'));
                                processRoute();
                                return false;
                            }).data('lennonized', true);
                        }
                    });

                //-- Hashify internal links if history is not available
                } else {
                    $internal_links.each(function() {
                        var $this = $(this),
                            href = $this.attr('href');
                        if ( !$this.data('lennonized') ) {
                            $this.attr('href', '/#' + href).data('lennonized', true);
                        }
                    });
                }

                if ( !initialized ) {
                    $(window).on(options.historyEnabled? 'popstate' : 'hashchange', processRoute);
                    initialized = true;
                }

            };

        return (function() {

            return {
                define: function(pathName, eventName) {

                    var occurence = pathName.match(/:/g) || [],
                        pattern = new RegExp('^' + pathName.replace(/\//g, "\\/").replace(/:(\w*)/g,"(\\w*)") + '$'),
                        route = {
                            eventName: eventName,
                            paramCount: occurence.length,
                            path: pathName,
                            pattern: pattern
                        };

                    //-- If the eventName is a string, we require a publishEvent
                    if ( 'string' === typeof eventName && !options.publishEvent ) {
                        throw new Error('Cannot publish the event "' + eventName + '" for the route "' + pathName + '". No publishEvent has been provided.');
                    }

                    //-- Add the route
                    options.logger.info('Adding route', pathName, route);
                    routes.push(route);

                    //-- Update the links
                    updateLinks(this);
                },

                dispatch: function(route, context) {
                    var e;

                    options.logger.info('Dispatching', route.path, 'with', context);

                    //-- Execute the callback
                    if ( 'function' === typeof route.eventName ) {
                        e = route.eventName(context || {});

                    //-- Run the publish event
                    } else {
                        e = options.publishEvent(route.eventName, context || {});
                    }

                    return e;
                },

                process: function() {
                    var context = {},
                        i, j,
                        paramKeys,
                        params,
                        path = options.historyEnabled? window.location.pathname : window.location.hash.replace('#', '') || '/';

                    //-- If we land on the page with a hash value and history is enabled, redirect to the non-hash page
                    if ( window.location.hash && options.historyEnabled ) {
                        window.location.href = window.location.hash.replace('#', '');
                    }

                    //-- Process the route
                    options.logger.info('Processing path', path);
                    for ( i in routes ) {

                        //-- See if the currently evaluated route matches the current path
                        params = path.match(routes[i].pattern);

                        //-- If there is a match, extract the path values and match them to their variable names for context
                        if ( params ) {
                            paramKeys = routes[i].path.match(/:(\w*)/g,"(\\w*)");
                            for ( j = 1; j <= routes[i].paramCount; j++ ) {
                                context[paramKeys[j - 1].replace(/:/g, '')] = params[j];
                            }
                            return this.dispatch(routes[i], context);
                        }

                    }

                    //-- No route has been found, hence, nothing dispatched
                    options.logger.warn('No route dispatched');
                }
            };
        }());
    };
}(this, jQuery, Modernizr));

if ( typeof define === "function" ) {
    define( "Lennon", [], function () { return Lennon; } );
}