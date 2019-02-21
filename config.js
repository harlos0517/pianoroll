/* CONFIGURATION */
var config = {
	// MIDI
	'midi' : {
		'file'           : 'demo2.mid'
	},
	'defaultBpm'       : 60,
	'playDelayRatio'   : 1.25, // compared to noteArea height,
	'speed'            : 0.40, // px:ms,
	'accelRatio'       : 1.0, // REALTIME

	// audio,
	'audio' : {
		'file'           : 'demo2.mp3',
		'format'         : 'mp3',
		'offset'         :    0, // ms
		'delay'          :  -70, // ms
		'volume'         : 0.8 // REALTIME
	},

	// pianoroll layout
	'startKey'         :  21,
	'endKey'           : 108,

	'keyRatio' : {
		'white' : {
			'height'       : 5.5
		},
		'black' : {
			'width'        : 0.6 ,
			'height'       : 3.5
		}
	},

	'paddingRatio' : {
		'top'            : 0,
		'bottom'         : 0.1,
		'side'           : 0.1
	},

	'noteRatio' : {
		'radius'         : 0.2,
		'margin'         : 0.1,
	},

	// colors,
	'keyDim'           : 0.8,
	'blackNoteDim'     : 0.5,
	'noteColor'        : [ // [track][channel]
		[0xFFAA00],
		[0xFFFF88],
		[0x55AAFF],
		[0x66FFFF],
	],

	// app & performance,
	'resolution' : {
		'width'          : 1920,
		'height'         : 1080
	},
	'backgroundColor'  : 0x000000,
	'antialias'        : true,
	'transparent'      : false,

	'renderBuffer'     : 100, // in px,
	'animationOnPause' : false, // REALTIME
	'skipFrameNum'     : 0 // skip frames
}