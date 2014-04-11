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
 * 		<li><img src="library/images/test-image-1.jpg" alt="" /></li>
 * 		<li><img src="library/images/test-image-2.jpg" alt="" /></li>
 * 		<li><img src="library/images/test-image-3.jpg" alt="" /></li>
 * 		<li><img src="library/images/test-image-4.jpg" alt="" /></li>
 * 		<li><img src="library/images/test-image-5.jpg" alt="" /></li>
 * </ul>
 *
 * var options = {
 * 		parent: document.querySelector('.example-carousel')
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
 * @option Number increment Number of tiles to display per frame. Default is 1.
 * @option String incrementMode Whether to move the carousel by frame or single tile. Accepted values are `frame` and `tile`. Default is `frame`.
 * @option Boolean encapsulateControls Default is `false`. If `true`, a wrapper is placed around the prev/next links and pagination and centered.
 * @option String prevText Default is `Previous`. Set controls previous button text.
 * @option String nextText Default is `Next`. Set controls next button text.
 * @option Number wrapperDelta Change wrapper width by this pixel value. Default is 0.
 * @option Number viewportDelta Change viewport width by this pixel value. Default is 0.
 * @option Function preFrameChange Callback fired before the transitional frame animation.
 * @option Function postFrameChange Callback fired after the transitional frame animation.
 * 
 * @name carousel
 */


!function(
    root,
    factory
) {
    
	if ( typeof define === 'function' && define.amd ) {
		// AMD. Register as an anonymous module.
		define(
		
			[
				'x',
			],
			
			factory
			
		);
	} else {
		// Browser globals
		root.carousel = factory(
            root.x
		);
	}

}(
    this,
	function( x ) {
	
		'use strict';
        
        // Make sure to use the correct case for IE
		var ieTest = document.createElement( 'li' ).getAttributeNode( 'tabindex' )
			, tabindex = tabindex = ieTest ? 'tabIndex' : 'tabindex'
			;
        
        ieTest = null;
        
        // @FLAG: The `parent` option should be present in `defaults`. Also, why is it named `parent`? Something like `element` makes more sense to me. | ryanfitzer on 03-05-2014 
		var defaults = {
            element: null,
			prevText: 'Previous',
			nextText: 'Next',
			increment: 1,
			incrementMode: 'frame', // tile or frame
			encapsulateControls: false,
			accessible: true,
			wrapperDelta: 0,
			viewportDelta: 0,
			preFrameChange: null,
			postFrameChange: null
		};
        
        // Options that require integers
        var defaultInts = [ 'increment', 'wrapperDelta', 'viewportDelta' ];
		
        // Define templates
        var templates = {
            container: [ 'div', 'carousel-container' ],
            viewport: [ 'div', 'carousel-viewport' ],
            button: [ 'button' ],
            controls: [ 'div', 'carousel-controls' ],
            controlsWrapper: [ 'div', 'carousel-controls-wrapper' ]
        }
        
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
		function insertAfter( targetNode, newNode ) {
			targetNode.parentNode.insertBefore( newNode, targetNode.nextSibling );
		}
		
		// Using addEvent method for IE8 support
		// Polyfill created by John Resig: http://ejohn.org/projects/flexible-javascript-events
		function addEvent( obj, evt, fn, capture ) {
			if ( obj.attachEvent ) {
				obj[ "e" + evt + fn ] = fn;
				obj[ evt + fn ] = function() { obj[ 'e' + evt + fn ]( window.event ); }
				obj.attachEvent( 'on' + evt, obj[ evt + fn ] );
			} else if ( obj.addEventListener ) {
				if ( !capture ) capture = false;
				obj.addEventListener( evt, fn, capture );
			}
		}
		
		// Using removeEvent method for IE8 support
		// Polyfill created by John Resig: http://ejohn.org/projects/flexible-javascript-events
        function removeEvent( obj, evt, fn ) {
			if ( obj.detachEvent ) {
				obj.detachEvent( 'on' + evt, obj[ evt + fn ] );
				obj[ evt + fn ] = null;
			} else {
				obj.removeEventListener( evt, fn, false );
			}
		}
        
        // Create carousel prototype
		var core = {
			
            // Required by XJS
			setup: function( options ) {

                this.x.publish( this.ns + '/setup/before' );
                
                this.cacheObj = {};
				this.element = options.element;
                this.options = this.x.extend( defaults, options );
				
				// Make sure the options are integers
                for ( var i = 0; i < defaultInts.length; i++ ) {
                    this.options[ defaultInts[i] ] = parseInt( this.options[ defaultInts[i] ], 10 );
                }
				
                this.setupPlugins();
                this.x.publish( this.ns + '/setup/after' );
                this.init();
			},

			init: function() {
                
                this.x.publish( this.ns + '/init/before' );
                
				var options			= this.options
					, self			= this
					, state			= self.state
					, carousel		= this.element
                    , parentNode    = carousel.parentNode
					, nextSibling	= carousel.nextSibling
                    , wrapper       = templates.container.cloneNode( true )
                    , viewport      = templates.viewport.cloneNode( true )
                    , controls      = templates.controls.cloneNode( true )
					, increment		= options.increment
					;
                
				// Make the main elements avaible to `this`
				this.parentNode = carousel.parentNode;
				this.wrapper = wrapper;
				this.carousel = carousel;
				this.viewport = viewport;
				
				// Remove and build the carousel
				parentNode.removeChild( carousel );
				wrapper.appendChild( viewport );
				viewport.appendChild( carousel );
				
				// Replace the carousel
				if ( nextSibling ) insertAfter( nextSibling, wrapper );
				else parentNode.appendChild( wrapper );
				
				// Build out the frames and state object
				this.state = this.normalizeState();
				
				wrapper.style.padding = options.wrapperDelta + 'px';
				viewport.style.padding = options.viewportDelta + 'px';
								
				this.buildNavigation();
				
				// Listen for focus on tiles
				// !TODO: Replace string	
				var panels = carousel.querySelectorAll( '.carousel-tile' );
				
				for( var i = 0, len = panels.length; i < len; ++i ) {
					// Using addEvent method for IE8 support
					addEvent( panels[ i ], 'focus', this.focusHandler );
					// Using addEvent method for IE8 support
					addEvent( panels[ i ], 'blur', this.focusHandler );
				}
				
                this.x.publish( this.ns + '/init/after' );
			},
			
			focusHandler: function( e ) {
				// !TODO: Replace string
				var cls = ' state-focus';
				
				// Using 'className' to support IE8
				if ( e.type === 'focus' ) e.target.className = e.target.className + cls;
				else e.target.className = e.target.className.replace( cls, '' );
				
			},
			
			cache: function( key, value ) {
				
				var cache = this.cacheObj
					, query = cache[ key ] !== 'undefined' ? cache[ key ] : undefined
					;
				
				if ( !value ) return query;
					
				cache[ key ] = value;
				
				return cache;
				
			},
			
			normalizeState: function() {
				
				var tile
					, tileStyle
					, tilePercent
					, index				= 0
					, state				= this.state
					, carousel			= this.carousel
					, tileArr			= carousel.children
					, origTiles			= tileArr
					, firstTile			= tileArr[ 0 ]
					, tileWidth			= firstTile.offsetWidth
					, tileHeight		= firstTile.offsetHeight
					, options			= this.options
					, increment			= options.increment
					, origTileLength	= tileArr.length
					, curTileLength		= origTileLength
					, frameLength		= Math.ceil( curTileLength / increment )
					, state = {
						index: index,
						offset: 0,
						spacers: 0,
						prevIndex: false,
						tileObj: tileArr,
						tileArr: tileArr,
						origTileLength: origTileLength,
						curTileLength: curTileLength,
						tileWidth: tileWidth,
						tileHeight: tileHeight,
						curTile: false,
						prevTile: false,
						frameArr: [],
						origFrameLength: frameLength,
						curFrameLength: frameLength,
						frameWidth: increment * tileWidth,
						curFrame: [],
						prevFrame: [],
						frameIndex: 0,
						prevFrameIndex: 0
					}
					;
					
				// !TODO: Replace string
				this.toggleAria( tileArr, 'add', 'carousel-tile' );
				
				// Build the normalized frames array
				for ( var sec = 0, len = tileArr.length / increment, count = 1; 
						sec < len; 
						sec++, count++ ) {
					tile = Array.prototype.slice.call( tileArr, increment * sec, increment * count );
					state.frameArr.push( tile );
				};
				
				state.index				= index;
				state.offset			= state.index ? state.frameWidth : state.offset;
				state.tileArr			= tileArr;						
				state.tileObj			= state.tileArr;
				state.curTile			= state.tileObj[ state.index ];
				state.curTileLength		= state.tileArr.length;
				state.curFrameLength	= Math.ceil( state.curTileLength / increment );
				state.frameIndex		= Math.ceil( state.index / increment );
				state.prevFrameIndex	= state.frameIndex;
				state.curFrame			= state.frameArr[ state.frameIndex ];
				state.tileDelta			= ( increment * state.curFrameLength ) - state.curTileLength;
				
				this.toggleAria( state.curFrame, 'remove' );
				
				tilePercent = ( parseInt( ( 100 / this.options.increment ) * 1000 ) ) / 1000;
				tileStyle = 'width: ' + tilePercent + '%; ';
					
				for ( var i = 0; i < tileArr.length; i++ ) {
					tileArr[ 0 ].setAttribute( 'style', tileStyle );
					tileArr[ 0 ].classList.add( 'component-container' ); // !TODO: Replace string
					carousel.appendChild( tileArr[ 0 ] );
				}
				
				return state;
				
			},
			
			updateState: function( index, animate ) {
	
				var self				= this
					, state				= self.state
					, ops				= self.options
					, increment			= ops.increment
					, prevFrameIndex	= state.frameIndex
					, index				= index > state.curTileLength - increment ? state.curTileLength - increment
											: index < 0 ? 0
											: index
					, frameIndex		= Math.ceil( index / increment )
					, isFirstFrame		= index === 0
					, isLastFrame		= index === state.curTileLength - increment
					;
							
				this.x.extend( this.state, {
					index: index,
					offset: state.tileWidth * index,
					prevIndex: state.index,
					prevTile: state.curTile,
					curTile: isLastFrame && state.tileDelta && ops.incrementMode === 'frame'
								? state.tileArr[ index + state.tileDelta ]
								: state.tileArr[ index ],
					curFrame: Array.prototype.slice.call( state.tileArr, isLastFrame ? index : index, increment + index ),
					prevFrame: state.curFrame,
					frameIndex: frameIndex,
					prevFrameIndex: state.frameIndex
				});
					 
				if ( animate ) this.animate();
				
				return state;
			},
			
			animate: function() {
				
                this.x.publish( this.ns + '/animate/before' );
                
				var state = this.state
					, index = state.index
					, targetIndex = index
					, options = this.options
					, carousel = this.element
					, increment = options.increment
					, tileWidth = state.tileWidth
					, preFrameChange = options.preFrameChange
					, postFrameChange = options.postFrameChange
					, isFirst = index === 0
					, isLast = index === ( state.curTileLength - increment )
					;
				
				// Execute preFrameChange callback
				if ( preFrameChange ) preFrameChange.call( this, state );
				
                carousel.setAttribute( 'class', 'state-busy' );
				this.toggleAria( state.tileArr, 'remove' );
				this.updateNavigation();
				this.toggleAria( state.tileArr, 'add' );
				this.toggleAria( state.curFrame, 'remove' );
				state.curTile.focus();
				carousel.className = carousel.className.replace( /\bstate-busy\b/, '' );
				
				// Execute postFrameChange callback
				postFrameChange && postFrameChange.call( this, state );
                
                this.x.publish( this.ns + '/animate/after' );
			},
			
			buildNavigation: function() {
				
                this.x.publish( 'nav/build/before' );
                
				var text
					, controlsWidth
					, newStyle
					, self				= this
					, state				= this.state
					, index				= state.index
					, wrapper			= self.wrapper
					, options			= self.options
					, increment			= options.increment
					, controls			= templates.controls.cloneNode( true )
					, controlsParent	= templates.controlsWrapper.cloneNode( true )
					, controlsWrapper 	= options.encapsulateControls ? controls : wrapper
					, viewport			= self.viewport
					, viewportWidth		= state.tileWidth * options.increment + options.viewportDelta
					, prevFrame			= 'prevFrame'
					, nextFrame			= 'nextFrame'
					;
				
				text = options.prevText;
				self.prevBtn = templates.button.cloneNode( true );
				self.prevBtn.setAttribute( 'class', prevFrame );
				self.prevBtn.innerHTML = text;
				
				text = options.nextText;
				self.nextBtn = templates.button.cloneNode( true );
				self.nextBtn.setAttribute( 'class', nextFrame );
				self.nextBtn.innerHTML = text;
					
				// Set click events buttons
				// Using addEvent method for IE8 support
				addEvent( this.parentNode, 'click', function( e ) {
					if ( e.target.nodeName == 'BUTTON' ) {
						var method = e.target.className;
						if ( method === 'prevFrame' || method === 'nextFrame' ) {
							self[ method ]();
						}
					}
				});
				
				// Disable buttons if there is only one frame
				if ( state.curTileLength <= options.increment ) {
					self.prevBtn.disabled = true;
					self.nextBtn.disabled = true;
				}
				
				// Disable prev button
				if ( index === 0 ) self.prevBtn.disabled = true;
				
				// Insert controls
				if ( !options.encapsulateControls ) {
					wrapper.parentNode.insertBefore( self.prevBtn, wrapper );
					insertAfter( wrapper, self.nextBtn );
				
				} else {
					controlsParent.appendChild( controls );
					controls.appendChild( self.prevBtn );
					controls.appendChild( self.nextBtn );
					wrapper.appendChild( controlsParent );
				}
                
                this.x.publish( 'nav/build/after' );
			},
			
			updateNavigation: function() {
				
				var self = this
					, state = this.state
					, index = state.index
					, options = self.options
					, isFirst = index === 0
					, isLast = index + this.options.increment >= state.curTileLength
					;
					
				if ( isFirst ) self.prevBtn.disabled = true;
				else self.prevBtn.disabled = false;
	
				if ( isLast ) self.nextBtn.disabled = true;
				else self.nextBtn.disabled = false;
			},
			
			prevFrame: function() {

				this.x.publish( this.ns + '/prevFrame/before' );
                
				var index = this.state.index;
				
				if ( this.options.incrementMode === 'tile' ) index--;
				else index = index - this.options.increment;
				
				this.updateState( index, true );
                
                this.x.publish( this.ns + '/prevFrame/after' );
                
				return this.carousel;
				
			},
			
			nextFrame: function() {
                
                this.x.publish( this.ns + '/nextFrame/before' );
				
				var index = this.state.index;
				
				if ( this.options.incrementMode === 'tile' ) index++;
				else index = index + this.options.increment;
				
				this.updateState( index, true );
                
                this.x.publish( this.ns + '/nextFrame/after' );
                
				return this.carousel;
				
			},
			
			reset: function() {
				
				var self = this
					, state = self.state
					, index = state.index
					, options = self.options
					;
				
				index = 0;
				
				self.updateState( index, true );
				
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
	}
);