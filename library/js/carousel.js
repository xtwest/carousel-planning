/**
 * Create an accessible JavaScript carousel out of any unordered list of tiles. Each tile should be placed in a list item `li` within a container `ul`. Additional markup is generated by JavaScript, and several required style definitions are included in a global stylesheet. These styles are external instead of plugin-generated so they can be overridden easily if neccessary.
 *
 * Tiles can contain any html content but must be equal in width. Measurement for the overall carousel and individual tiles is based on the width of the first tile. Height can vary, although because the images are lazy loaded, image heights are evaluated just-in-time. This can lead to a slight page jump if a hidden tile is taller than the visible tiles once its images are loaded. CSS can be used to style the "previous" and "next" buttons, as well as the pagination menu (if pagination is enabled).
 *
 * Instantiate the carousel(s) by calling the plugin on an element or elements and passing an optional options object.
 *
 * Requires x.js
 *
 * @demo demo.php
 *
 * @example
 * SOURCE HTML STRUCTURE
 * <ul class="example-carousel">
 *      <li><img src="library/images/test-image-1.jpg" alt="" /></li>
 *      <li><img src="library/images/test-image-2.jpg" alt="" /></li>
 *      <li><img src="library/images/test-image-3.jpg" alt="" /></li>
 *      <li><img src="library/images/test-image-4.jpg" alt="" /></li>
 *      <li><img src="library/images/test-image-5.jpg" alt="" /></li>
 * </ul>
 *
 * var options = {
 *      parent: document.querySelector('.example-carousel')
 * }
 * var carousel1 = core();
 * carousel1.init(options);
 *
 *
 * @title Example #1: Default Instantiation
 * @syntax javascript
 * @desc Instantiation using default settings: single item carousel, one tile displayed at a time, advances one tile at a time, does not loop and does not display pagination. Note: the `carousel` class is not required for instantiation - any selector can be used.
 *
 *
 * @param Object options
 * @option Number tilesPerFrame Number of tiles to display per frame. Default is 1.
 * @option String incrementMode Whether to move the carousel by frame or single tile. Accepted values are `frame` and `tile`. Default is `frame`.
 * @option Boolean wrapControls Default is `false`. If `true`, a wrapper is placed around the prev/next links and pagination and centered.
 * @option String prevText Default is `Previous`. Set controls previous button text.
 * @option String nextText Default is `Next`. Set controls next button text.
 * @option Number wrapperDelta Change wrapper width by this pixel value. Default is 0.
 * @option Number viewportDelta Change viewport width by this pixel value. Default is 0.
 * @option Function preFrameChange Callback fired before the transitional frame animation.
 * @option Function postFrameChange Callback fired after the transitional frame animation.
 *
 * @name carousel
 */
define(

    [
        'vendor/x',
    ],

    function( x ) {

        'use strict';

        // Make sure to use the correct case for IE
        var ieTest = document.createElement( 'li' ).getAttributeNode( 'tabindex' )
            , tabindex = tabindex = ieTest ? 'tabIndex' : 'tabindex'
            ;

        ieTest = null;

        var defaults = {
            element: null,
            prevText: 'Previous',
            nextText: 'Next',
            tilesPerFrame: 1,
            incrementMode: 'frame', // tile or frame
            wrapControls: false,
            accessible: true,
            preFrameChange: null,
            postFrameChange: null,
            ready: null,
            wrapperClass: '',
            preventNavDisable: false,
            tileClass: 'carousel-tile'
        };

        // Options that require integers
        var defaultInts = [ 'tilesPerFrame', 'wrapperDelta', 'viewportDelta' ];

        // Define templates
        var templates = {
            wrapper: [ 'div', 'carousel-wrapper' ],
            viewport: [ 'div', 'carousel-viewport' ],
            button: [ 'button' ],
            controls: [ 'div', 'carousel-controls' ],
            controlsWrapper: [ 'div', 'carousel-controls-wrapper' ]
        };

        // Compile templates
        for ( var template in templates ) {

            if ( !templates[ template ][1] ) {

                templates[ template ] = document.createElement( templates[ template ][0] );
                continue;
            }

            var tempTmpl = document.createElement( templates[ template ][0] );
            tempTmpl.setAttribute( 'class', templates[ template ][1] );
            templates[ template ] = tempTmpl;
        }

        // Utilities
        function outerWidth( element ) {

          var width = element.offsetWidth
              , style = getComputedStyle( element ) || element.currentStyle; // element.currentStyle is for IE8
              ;

          width += parseInt( style.marginLeft ) + parseInt( style.marginRight );

          return width;
        }

        function outerHeight( element ) {

          var height = element.offsetHeight
              , style = getComputedStyle( element ) || element.currentStyle; // element.currentStyle is for IE8
              ;

          height += parseInt( style.marginTop ) + parseInt( style.marginBottom );

          return height;
        }

        function insertAfter( newNode, targetNode ) {

            if ( !targetNode.parentNode ) throw new Error( 'insertAfter failed. The targetNode argument has no parentNode.' );

            targetNode.parentNode.insertBefore( newNode, targetNode.nextSibling );

            return newNode;
        }

        // Using addEvent method for IE8 support
        // Polyfill created by John Resig: http://ejohn.org/projects/flexible-javascript-events
        function addEvent( obj, evt, fn, capture ) {
            
            if ( obj.addEventListener ) {
                if ( !capture ) capture = false;
                obj.addEventListener( evt, fn, capture );
            }
            else if ( obj.attachEvent ) {
                obj[ "e" + evt + fn ] = fn;
                obj[ evt + fn ] = function() { obj[ 'e' + evt + fn ]( window.event ); };
                obj.attachEvent( 'on' + evt, obj[ evt + fn ] );
            }
        }

        // Using removeEvent method for IE8 support
        // Polyfill created by John Resig: http://ejohn.org/projects/flexible-javascript-events
        function removeEvent( obj, evt, fn ) {
            
            if ( obj.removeEventListener ){
                obj.removeEventListener( evt, fn, false );
            }
            else if ( obj.detachEvent ) {
                obj.detachEvent( 'on' + evt, obj[ evt + fn ] );
                obj[ evt + fn ] = null;
            }
        }

        /*
            TODO Document this sucker
        */
        // Based off of http://codereview.stackexchange.com/questions/13046/javascript-repeat-a-function-x-times-at-i-intervals
        function repeat( interval, repeats, immediate, callback ) {

            var timer;

            var trigger = function () {
                callback();
                --repeats || clearInterval( timer );
            };

            interval = interval <= 0 ? 1000 : interval; // default: 1000ms
            repeats = parseInt( repeats, 10 ) || 0; // default: repeat forever
            timer = setInterval( trigger, interval );

            // Run immediately
            if ( !!immediate ) { trigger(); }
        }
            
        function getObjType( obj ) {
            
           return Object.prototype.toString.call( obj );
        }

        // Create carousel prototype
        var core = {

            // Required by XJS
            setup: function( options ) {

                this.cacheObj = {};
                this.element = options.element;
                this.options = this.x.extend( {}, defaults, options );

                // Make sure the options are integers
                for ( var i = 0; i < defaultInts.length; i++ ) {
                    this.options[ defaultInts[i] ] = parseInt( this.options[ defaultInts[i] ], 10 );
                }

                // Add utilities to the API passed to plugins
                this.x.outerWidth = outerWidth;
                this.x.outerHeight = outerHeight;
                this.x.insertAfter = insertAfter;
                this.x.addEvent = addEvent;
                this.x.removeEvent = removeEvent;
                this.x.repeat = repeat;
                this.x.getObjType = getObjType;

                // Setup plugins
                this.setupPlugins();

                this.init();
            },

            init: function() {

                this.x.publish( this.ns + '/init/before' );

                var options             = this.options
                    , self              = this
                    , carousel          = this.element
                    , parentNode        = carousel.parentNode
                    , nextSibling       = carousel.nextSibling
                    , wrapper           = templates.wrapper.cloneNode( true )
                    , viewport          = templates.viewport.cloneNode( true )
                    , controls          = templates.controls.cloneNode( true )
                    , tilesPerFrame     = options.tilesPerFrame
                    ;
                
                // Save original tiles per frame data
                this.options.origTilesPerFrame = tilesPerFrame;
                    
                // Make the main elements available to `this`
                this.parentNode = carousel.parentNode;
                this.wrapper = wrapper;
                this.carousel = carousel;
                this.viewport = viewport;

                // Remove and build the carousel
                parentNode.removeChild( carousel );
                wrapper.appendChild( viewport );
                viewport.appendChild( carousel );

                // Replace the carousel
                if ( nextSibling ) insertAfter( wrapper, nextSibling );
                else parentNode.appendChild( wrapper );

                // Build out the frames and state object
                this.initState();

                this.buildNavigation();

                // Listen for focus on tiles
                var panels = carousel.querySelectorAll( '.' + options.tileClass );

                for ( var i = 0, len = panels.length; i < len; ++i ) {
                    // Using addEvent method for IE8 support
                    addEvent( panels[ i ], 'focus', this.focusHandler );
                    // Using addEvent method for IE8 support
                    addEvent( panels[ i ], 'blur', this.focusHandler );
                }

                if ( options.ready ) {

                    options.ready.call( this, this.state );
                }

                this.x.publish( this.ns + '/init/after' );
            },

            focusHandler: function( e ) {

                var cls = ' state-focus' // TODO Replace string
                    , target = e.target || e.srcElement // IE uses srcElement
                    ;

                // Using 'className' to support IE8
                if ( e.type === 'focus' ) target.className = target.className + cls;
                else target.className = target.className.replace( cls, '' );
            },

            cache: function( key, value ) {

                var cache = this.cacheObj
                    , query = cache[ key ] !== 'undefined' ? cache[ key ] : undefined
                    ;

                if ( typeof value !== 'boolean' && !value ) return query;

                cache[ key ] = value;

                return cache;

            },
            
            reinit: function() {
                
                this.x.publish( this.ns + '/reinit/before' );
                
                this.buildFrames();
                
                this.rebuildNavigation();
                
                this.x.publish( this.ns + '/reinit/after' );
            },
            
            updateOptions: function( optsObj ) {
                
                var rebuild;

                if ( getObjType( optsObj ) === '[object Object]' ) {
                    
                    rebuild = ( typeof optsObj.tilesPerFrame === 'number' && optsObj.tilesPerFrame !== this.options.tilesPerFrame ) ? true : false;
                    
                    this.x.extend( this.options, optsObj );
                    
                    if ( rebuild ) {
                        this.reinit();
                    }
                
                    return this.options;
                }
                
                else {
                    return false;
                }
            },
            
            updateState: function( stateObj ) {
                
                var syncIndex;
                
                if ( getObjType( stateObj ) === '[object Object]' ) {
                    
                    this.x.extend( this.state, stateObj );
                    
                    // console.log(this.state);
                
                    return this.state;
                }
                
                else {
                    return false;
                }
            },

            initState: function() {

                this.x.publish( this.ns + '/initState/before' );

                var tiles
                    , tileStyle
                    , tilePercent
                    , self              = this
                    , index             = 0
                    , state             = this.state
                    , carousel          = this.carousel
                    , tileArr           = carousel.children
                    , origTiles         = tileArr
                    , firstTile         = tileArr[ 0 ]
                    , options           = this.options
                    , tilesPerFrame     = options.tilesPerFrame
                    , origTileLength    = tileArr.length
                    , curTileLength     = origTileLength
                    , frameLength       = Math.ceil( curTileLength / tilesPerFrame )
                    , state = {
                        index: index,
                        offset: 0,
                        spacers: 0,
                        prevIndex: false,
                        tileObj: tileArr,
                        tileArr: tileArr,
                        origTileLength: origTileLength,
                        curTileLength: curTileLength,
                        tilePercent: 100,
                        curTile: false,
                        prevTile: false,
                        frameArr: [],
                        origFrameLength: frameLength,
                        curFrameLength: frameLength,
                        curFrame: [],
                        prevFrame: [],
                        frameIndex: 0,
                        frameNumber: 1,
                        prevFrameIndex: 0,
                        prevFrameNumber: 1,
                        origWrapperClass: self.wrapper.className,
                        dom: {
                            wrapper: self.wrapper,
                            viewport: self.viewport,
                            carousel: self.element,
                            controlsWrapper: self.controlsWrapper,
                            controls: self.controls,
                            prevBtn: self.prevBtn,
                            nextBtn: self.nextBtn
                        }
                    }
                    ;

                this.state = state;

                this.toggleAria( tileArr, 'add', options.tileClass ); //init tile classes (all tiles hidden by default)

                // Build the normalized frames array
                this.buildFrames();

                this.x.publish( this.ns + '/initState/after' );
            },
            
            buildFrames: function() {
                
                this.x.publish( this.ns + '/buildFrames/before' );
                
                var tiles, thisFrame, frameStart, frameEnd, carEnd
                    , self              = this
                    , state             = self.state
                    , tileArr           = state.tileArr
                    , options           = self.options
                    , tilesPerFrame     = options.tilesPerFrame
                    , carousel          = self.element
                    ;

                this.toggleAria( state.tileArr, 'add' ); //hide all tiles
                
                state.frameArr = [];
                
                for ( var sec = 0, len = tileArr.length / tilesPerFrame, count = 1;
                        sec < len;
                        sec++, count++ ) {

                    // This is crashing IE8 due to tileArr being a host object (HTMLCollection) instead of a JavaScript object
                    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice#Streamlining_cross-browser_behavior
                    // Every way I try to get around it, including the MDN shim, still causes IE8 to crash
                    tiles = Array.prototype.slice.call( tileArr, tilesPerFrame * sec, tilesPerFrame * count );

                    // var tiles = [];
                    // for ( var i = tilesPerFrame * sec, ii = 0, end = tilesPerFrame * count; i < end; i++, ii++) {
                    //     console.log(i);
                    //     console.log(ii);
                    //     console.log(end);
                    //     console.log(' ');
                    //     tiles[ii] = tileArr[i];
                    // }

                    state.frameArr.push( tiles );
                }
                
                //console.log('state.frameArr', state.frameArr);

                state.tileObj           = tileArr;
                state.curTile           = state.tileObj[ state.index ];
                state.curTileLength     = tileArr.length;
                state.curFrameLength    = Math.ceil( state.curTileLength / tilesPerFrame );
                state.frameIndex        = Math.ceil( state.index / tilesPerFrame );
                state.frameNumber       = state.frameIndex + 1;
                state.prevFrameIndex    = state.frameIndex;
                state.prevFrameNumber   = state.prevFrameIndex + 1;
                state.curFrame          = state.frameArr[ state.frameIndex ];
                state.tileDelta         = ( options.tilesPerFrame * state.curFrameLength ) - state.curTileLength;
                state.tileWidth         = outerWidth( state.tileObj[ state.index ] );
                state.tileHeight        = outerHeight( state.tileObj[ state.index ] );
                state.trackWidth        = state.tileWidth * state.curTileLength;
                state.trackPercent      = 100 * state.curTileLength;
                state.frameWidth        = options.tilesPerFrame * state.tileWidth;
                state.offset            = state.index ? ( state.tileWidth / options.tilesPerFrame ) * state.index : 0;

                state.dom.wrapper.setAttribute( 'class', state.origWrapperClass + ' ' + options.wrapperClass );

                // tilePercent = ( parseInt( ( 100 / options.tilesPerFrame ) * 1000 ) ) / 1000;
                // tileStyle = 'width: ' + tilePercent + '%; ';
                //
                // for ( var i = 0; i < tileArr.length; i++ ) {
                //     tileArr[ i ].setAttribute( 'style', tileStyle );
                //                     // tileArr[ 0 ].classList.add( 'component-container' ); // !TODO: Replace string
                //                     // carousel.appendChild( tileArr[ 0 ] );
                // }
                
                //call calculate - updates state (publish)
                //dom styler - applies calculations (subscribed)
                this.calcDimensions( tilesPerFrame );

                this.updateDimensions();
                
                // Update position of carousel based on index
                this.updatePosition( state.index );
                
                // Determine current frame based on increment mode
                if ( options.incrementMode === 'frame' ) { //frame increment
                    
                    thisFrame = state.curFrame;
                }
                
                else { //tile increment
                    
                    thisFrame = [];
                    
                    frameEnd = state.index + tilesPerFrame;
                    carEnd = state.curTileLength;
                    
                    if ( frameEnd > carEnd ) {
                        
                        frameStart = carEnd - tilesPerFrame;
                        frameEnd = carEnd;
                    }
                    
                    else {
                        frameStart = state.index;
                    }
                    
                    for ( var i = frameStart; i < frameEnd; i++ ) {
                        thisFrame.push( state.tileObj[ i ] );
                    }
                }
                
                this.toggleAria( thisFrame, 'remove' ); //makes tiles in current frame visible
                
                this.x.publish( this.ns + '/buildFrames/after' );
            },

            syncState: function( index, animate ) {
                
                // Don't update state during tile transition
                if ( !this.cache( 'animating' ) ) {
                
                    this.x.publish( this.ns + '/syncState/before', index );

                    var self                = this
                        , state             = self.state
                        , options           = self.options
                        , tilesPerFrame     = options.tilesPerFrame
                        , prevFrameIndex    = state.frameIndex
                        , prevFrameNumber   = state.frameIndex + 1
                        , origIndex         = state.index
                        , index             = index > state.curTileLength - tilesPerFrame ? state.curTileLength - tilesPerFrame
                                                : index < 0 ? 0
                                                : index
                        , frameIndex        = Math.ceil( index / tilesPerFrame )
                        , frameNumber       = frameIndex + 1
                        , isFirstFrame      = index === 0
                        , isLastFrame       = index === state.curTileLength - tilesPerFrame
                        , updateObj = {
                            index: index,
                            offset: state.tileWidth * index,
                            prevIndex: state.index,
                            prevTile: state.curTile,
                            curTile: isLastFrame && state.tileDelta && options.incrementMode === 'frame'
                                        ? state.tileArr[ index + state.tileDelta ]
                                        : state.tileArr[ index ],
                            curFrame: Array.prototype.slice.call( state.tileArr, isLastFrame ? index : index, tilesPerFrame + index ),
                            prevFrame: state.curFrame,
                            frameIndex: frameIndex,
                            frameNumber: frameNumber,
                            prevFrameIndex: state.frameIndex,
                            prevFrameNumber: state.frameNumber
                        };

                    this.updateState( updateObj );
                    
                    //this.x.publish( this.ns + '/syncState/update', updateObj );
                
                    // Animate tile index change
                    if ( animate ) {
                        this.animate();
                    }
                    
                    // Even if no animation, make sure carousel correctly positioned
                    else {
                        this.updatePosition( state.index );
                    }
                    
                    this.x.publish( this.ns + '/syncState/after', origIndex, index );

                    return state;
                }
            },
            
            updatePosition: function( index ) {
              
                var carousel = this.element;
                var state = this.state;
                var translateAmt = state.tilePercent * index;
                var transformStr = 'translateX(-' + translateAmt + '%)';
                
                if ( 'transition' in carousel.style ) {
                    
                    // Prevent animation of re-position
                    carousel.style.transition = '';
                    carousel.style.WebkitTransition = '';
                    
                    carousel.style.transform = transformStr;
                    carousel.style.webkitTransform = transformStr;
                }

                // IE9
                else if ( 'msTransform' in carousel.style ) {
                    
                    carousel.style.msTransform = transformStr;
                }
                
                this.toggleAria( state.tileArr, 'add' );
                this.toggleAria( state.curFrame, 'remove' );
            },

            updateDimensions: function() {

                var state = this.state
                    , tileArr = state.tileArr
                    , tileStyle = state.tilePercent + '%'
                    , trackStyle = state.trackPercent + '%'
                    ;

                this.carousel.style.width = trackStyle;

                for ( var i = 0; i< tileArr.length; i++ ) {

                    tileArr[ i ].style.width = tileStyle;
                }

            },

            calcDimensions: function( tilesPerFrame ) {

                var state = this.state
                    , numTiles = state.tileArr.length
                    , percentIncrement = 100 / tilesPerFrame
                    , trackPercent = percentIncrement * numTiles
                    , tilePercent = 100 / ((trackPercent / 100) * tilesPerFrame)
                    ;

                state.trackPercent = trackPercent;
                state.tilePercent = tilePercent;

                // make pixel values?
                state.trackWidth = state.tileWidth * numTiles;
            },

            animate: function() {

                this.x.publish( this.ns + '/animate/before' );
                
                this.cache( 'animating', true );

                var self = this
                    , state = this.state
                    , index = state.index
                    , targetIndex = index
                    , options = this.options
                    , carousel = this.element
                    , tilesPerFrame = options.tilesPerFrame
                    , tileWidth = state.tileWidth
                    , tilePercent = state.tilePercent
                    , preFrameChange = options.preFrameChange
                    , postFrameChange = options.postFrameChange
                    , isFirst = index === 0
                    , isLast = index === ( state.curTileLength - tilesPerFrame )
                    , seconds = 1
                    , translateAmt = tilePercent * targetIndex
                    , transformStr = 'translateX(-' + translateAmt + '%)'
                    , translateStr = 'transform ' + seconds + 's'
                    , numFrames = Math.ceil( (seconds * 1000) / 60 )
                    , origin = state.prevIndex * tilePercent
                    , distance = origin - translateAmt
                    , frameDist = distance / numFrames
                    ;

                var listener = function(e) {

                    self.toggleAria( state.tileArr, 'add' );
                    self.toggleAria( state.curFrame, 'remove' );

                    //state.curTile.focus();
                    carousel.className = carousel.className.replace( /\bstate-busy\b/, '' );
                    
                    self.cache( 'animating', false );

                    // Execute postFrameChange callback
                    postFrameChange && postFrameChange.call( self, state );

                    self.x.publish( self.ns + '/transition/end' );
                    self.x.publish( self.ns + '/animate/after' );
                };

                // Execute preFrameChange callback
                if ( preFrameChange ) preFrameChange.call( this, state );

                // carousel.setAttribute( 'class', 'state-busy' );
                this.toggleAria( state.tileArr, 'remove' );
                this.updateNavigation();

                // Use CSS transitions
                if ( 'transition' in carousel.style ) {

                    carousel.style.transition = translateStr;
                    carousel.style.WebkitTransition = '-webkit-' + translateStr;

                    this.x.subscribe( this.ns + '/transition/end', function() {

                        carousel.removeEventListener( 'transitionend', listener, false );
                    });

                    carousel.addEventListener( 'transitionend', listener, false );

                    carousel.style.transform = transformStr;
                    carousel.style.webkitTransform = transformStr;
                }

                // IE9 does not support CSS transitions
                /*
                    TODO Needs easing
                */
                else if ( 'msTransform' in carousel.style ) {

                    repeat( 16, numFrames, true, function() {

                        origin -= frameDist;

                        if ( origin < 0 ) {

                            carousel.style.msTransform = 'translateX( 0px )';
                            return;
                        }

                        carousel.style.msTransform = 'translateX( -' + origin + '% )';

                    });

                    setTimeout( function() {

                        listener();

                    }, ( 300 * seconds ) );
                }
            },

            buildNavigation: function() {

                this.x.publish( this.ns + '/navigation/before' );

                var text
                    , controlsWidth
                    , newStyle
                    , self              = this
                    , state             = this.state
                    , index             = state.index
                    , wrapper           = self.wrapper
                    , options           = self.options
                    , tilesPerFrame     = options.tilesPerFrame
                    , controls          = templates.controls.cloneNode( true )
                    , controlsParent    = templates.controlsWrapper.cloneNode( true )
                    , controlsWrapper   = options.wrapControls ? controls : wrapper
                    // , viewportWidth        = state.tileWidth * options.tilesPerFrame + options.viewportDelta
                    , viewportWidth     = outerWidth( self.viewport )
                    , prevFrame         = 'prevFrame' // TODO Replace string
                    , nextFrame         = 'nextFrame' // TODO Replace string
                    , hasNavInited      = this.cache( 'hasNavInited' )
                    ;

                this.controls = controls;
                this.controlsWrapper = controlsWrapper;

                text = options.prevText;
                self.prevBtn = templates.button.cloneNode( true );
                self.prevBtn.setAttribute( 'class', prevFrame );
                self.prevBtn.setAttribute( 'data-prev', '' );
                self.prevBtn.innerHTML = text;

                text = options.nextText;
                self.nextBtn = templates.button.cloneNode( true );
                self.nextBtn.setAttribute( 'class', nextFrame );
                self.nextBtn.setAttribute( 'data-next', '' );
                self.nextBtn.innerHTML = text;

                // Disable buttons if there is only one frame
                if ( state.curTileLength <= options.tilesPerFrame ) {

                    self.prevBtn.disabled = true;
                    self.nextBtn.disabled = true;
                }

                // Disable prev button
                if ( !options.preventNavDisable && index === 0 ) self.prevBtn.disabled = true;

                this.state.dom.prevBtn = this.prevBtn;
                this.state.dom.nextBtn = this.nextBtn;
                this.state.dom.controlsWrapper = this.controlsWrapper;
                this.state.dom.controls = this.controls;

                // Insert controls
                if ( !options.wrapControls ) {

                    this.x.publish( this.ns + '/navigation/controls/insert/before', wrapper, self.prevBtn, self.nextBtn );

                    wrapper.insertBefore( self.prevBtn, self.viewport );
                    insertAfter( self.nextBtn, self.viewport );

                    this.x.publish( this.ns + '/navigation/controls/insert/after', wrapper, self.prevBtn, self.nextBtn );

                } else {

                    this.x.publish( this.ns + '/navigation/controls/insert/before', controls, self.prevBtn, self.nextBtn );

                    controlsParent.appendChild( controls );
                    controls.appendChild( self.prevBtn );
                    controls.appendChild( self.nextBtn );
                    wrapper.appendChild( controlsParent );

                    this.x.publish( this.ns + '/navigation/controls/insert/after', controls, self.prevBtn, self.nextBtn );
                }

                // Set click events buttons
                // Using addEvent method for IE8 support
                if ( !hasNavInited ) {
                    addEvent( this.wrapper, 'click', this.handleNavigation.bind( this ) );
                }

                this.cache( 'hasNavInited', true );

                this.x.publish( this.ns + '/navigation/after' );
            },
            
            rebuildNavigation: function() {
                
                if ( this.controlsWrapper ) {
                
                    this.x.publish( this.ns + '/navigation/rebuild/before' );
                    
                    // Double parentNode necessary since controlsWrapper element is getting overwritten with controls element
                    this.controlsWrapper.parentNode.parentNode.removeChild( this.controlsWrapper.parentNode );
                    
                    this.buildNavigation();
                
                    this.x.publish( this.ns + '/navigation/rebuild/after' );
                }
            },

            updateNavigation: function() {

                var self = this
                    , state = this.state
                    , index = state.index
                    , options = self.options
                    , isFirst = index === 0
                    , isLast = index + this.options.tilesPerFrame >= state.curTileLength
                    ;
                
                if ( options.preventNavDisable ) return;
                
                if ( isFirst ) self.prevBtn.disabled = true;
                else self.prevBtn.disabled = false;

                if ( isLast ) self.nextBtn.disabled = true;
                else self.nextBtn.disabled = false;
            },

            handleNavigation: function(e) {

                var method
                    , target = e.target || e.srcElement // IE uses srcElement
                    ;

                if ( target.nodeName.toLowerCase() !== 'button' ) return;

                method = target.hasAttribute( 'data-next' ) ? 'nextFrame'
                    : target.hasAttribute( 'data-prev' ) ? 'prevFrame'
                    : false
                    ;

                if ( method ) this[ method ]();
            },

            prevFrame: function() {

                this.x.publish( this.ns + '/prevFrame/before' );

                var index = this.state.index;

                if ( this.options.incrementMode === 'tile' ) index--;
                else index = index - this.options.tilesPerFrame;

                this.syncState( index, true );

                this.x.publish( this.ns + '/prevFrame/after' );

                return this.carousel;

            },

            nextFrame: function() {

                this.x.publish( this.ns + '/nextFrame/before' );

                var index = this.state.index;

                if ( this.options.incrementMode === 'tile' ) index++;
                else index = index + this.options.tilesPerFrame;

                this.syncState( index, true );

                this.x.publish( this.ns + '/nextFrame/after' );

                return this.carousel;

            },

            jumpToFrame: function( frame ) {

                var self = this,
                    state = self.state,
                    options = self.options,
                    frame = parseInt( frame, 10 ),
                    tilesPerFrame = self.options.tilesPerFrame,
                    index = ( options.incrementMode === 'frame' ) ? 
                            ( frame * tilesPerFrame ) - tilesPerFrame : frame;

                index = index < 0 ? 0 : index;

                if ( ( options.incrementMode === 'tile' && index === state.index ) || ( options.incrementMode === 'frame' && frame > state.curFrameLength ) ) {
                    return self.carousel;
                }

                this.syncState( index, true );

                return self.carousel;

            },

            reset: function() {

                var self = this
                    , state = self.state
                    , index = state.index
                    , options = self.options
                    ;

                index = 0;

                self.syncState( index, true );

                return this.carousel;

            },

            toggleAria: function( itemArray, operation, initClass ) {

                var item
                    , classes
                    , i = 0
                    , self = this
                    , state = self.state
                    , length = itemArray.length
                    , ariaHClass = ' state-hidden'
                    , ariaVClass = ' state-visible'
                    , rAriaHClass = /\sstate-hidden/
                    , rAriaVClass = /\sstate-visible/
                    , rSpacerClass = /carousel-tile-spacer/
                    , add = operation === 'add' ? true : false
                    , initClass = initClass ? ' ' + initClass : ''
                    , hasAriaInited = this.cache( 'hasAriaInited' )
                    ;

                for ( ; i < length; i++ ) {

                    item = itemArray[ i ];
                    classes = item.className + initClass;

                    if ( rSpacerClass.test( classes ) ) continue;

                    if ( add ) classes = classes.replace( rAriaVClass, ariaHClass );
                    else classes = classes.replace( rAriaHClass, ariaVClass );

                    item.className = classes.replace( /^\s/, '' );

                    if ( !hasAriaInited ) {
                        item.className = item.className + ariaHClass;
                        item.setAttribute( tabindex, '-1' );
                    }

                    classes = null;
                }

                this.cache( 'hasAriaInited', true );
            }
        }

        // Define the carousel
        return x.define( 'carousel', core );
});