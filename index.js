/* PIXI ALIAS */
const App          = PIXI.Application
const loader       = PIXI.loader
const resource     = PIXI.loader.resources
const Sprite       = PIXI.Sprite
const Container    = PIXI.Container
const TextureCache = PIXI.utils.TextureCache
const Graphics     = PIXI.Graphics
const Ticker       = PIXI.Ticker
const filters      = PIXI.filters

/* CONFIGURATION */
// pianoroll layout
var startKey       =   21 // Must be on white-key
var endKey         =  108 // Must be on white-key
var whiteKeyNum    =   52
var blackKeyNum    =   36
var keyNum         = endKey - startKey + 1
var appWidth       = 1920
var appHeight      = 1080
var pianoWidth     = appWidth * .8
var whiteKeyWidth  = pianoWidth / whiteKeyNum
var whiteKeyHeight = whiteKeyWidth * 5.5
var blackKeyWidth  = whiteKeyWidth * .6
var blackKeyHeight = whiteKeyWidth * 3.5
var keyRadius      = whiteKeyWidth / 5
var pianoHeight    = whiteKeyHeight
var paddingLR      = (appWidth - pianoWidth) / 2
var paddingTop     = 0
var paddingBottom  = appHeight * 0.1
var noteAreaHeight = appHeight - pianoHeight - paddingTop - paddingBottom
var noteName       = ['C','C#','D','Eb','E','F','F#','G','G#','A','Bb','B']
var noteMarginLR   = 3
var renderBuffer   = 100

// MIDI
var speed          = 0.4 // px:ms
var midiFile       = 'demo2.mid'
var midiTrackNum   = 0
var midiDelay      = noteAreaHeight * 1.25 / speed // ms
var defaultBpm     = 80
var audioFile      = 'demo2.mp3'
var audioOffset    = 0 // ms
var audioDelay     = -70 // ms
var playbackListen = true
var curEventListen = 0
var accelRatio     = 1.0

// colors
var keyDim         = .8
var blackNoteDim   = .5
var noteColor = [ // [track]
	0xFFAA00,
	0xFFFF88,
	0x55AAFF,
	0x66FFFF
]
function colorFilter(hex,dim) {
	let filter = new filters.ColorMatrixFilter()
	var R = (hex/65536  ) / 255 * dim
	var G = (hex/256%256) / 255 * dim
	var B = (hex    %256) / 255 * dim
	filter.matrix = 
		[R, 0, 0, 0, 0,
		 0, G, 0, 0, 0,
		 0, 0, B, 0, 0,
		 0, 0, 0, 1, 0]
	return filter
}
function dimFilter(v) {
	let filter = new filters.ColorMatrixFilter()
	filter.matrix = 
		[v, 0, 0, 0, 0,
		 0, v, 0, 0, 0,
		 0, 0, v, 0, 0,
		 0, 0, 0, 1, 0]
	return filter
}

// app settings
var app = new App({
	width: appWidth,
	height: appHeight,
	antialias:   true,
	transparent: false,
	autoResize:  true,
	resolution:  1,
})

// sound
var sound = new Howl({
	src: [audioFile],
	autoplay: false,
  loop: false,
  volume: 0.8/accelRatio,
  rate: accelRatio
})

/* PARAMETERS */
// timer
var frameUpdate
var secondUpdate
var frames = 0
var ms = 0
var secondTicker = 0
var skip = 2 // skip frames

// sprite and masks and sound and midi
var pianoKeys = new Container()
var pianoNotes = new Container()
var pianoNotesArea = new Container()
var mask = new Graphics()
var midiData = {}
var midiJson = {}

/* SCALING */
// scaling to window
function reScale() { scaleToWindow(app.view, '#333333') }
window.addEventListener('resize',reScale)
$('body>.wrap').apnd(app.view)
reScale()

/* LOAD ASSETS */
// load images and sounds and midi
loader.add([
	'whiteOn.svg',
	'whiteOff.svg',
	'blackOn.svg',
	'blackOff.svg'
]).load(()=>{
	sound.once('load',()=>{
		midi2json(midiFile,d=>{
			midiData = d
			midiJson = modifyJson(d)
			setup()
		})
	})
})

/* FUNCTIONS */
// note function
function isWhiteKey(i) {
	var mod = i % 12
	return (mod==0 || mod==2 || mod==4 || mod==5 || mod==7 || mod==9 || mod==11)
}

function isBlackKey(i) {
	return !isWhiteKey(i)
}

function getNoteName(i) {
	var mod = i % 12
	return noteName [mod]
}

// piano roll rendering
function getWhiteKeyIndex(i) {
	var whiteKey = i
	if(!isWhiteKey(i)) whiteKey++
	var mod = whiteKey%12
	var oct = Math.floor(whiteKey/12)
	var newmod = Math.floor(mod/2) + mod%2
	return 7*oct+newmod
}

function getLeftPos(i) {
	var dist = getWhiteKeyIndex(i)-getWhiteKeyIndex(startKey)
	return whiteKeyWidth*dist-(isWhiteKey(i)?0:(blackKeyWidth/2))
}

function addKey(i) {
	var key = new Sprite(resource[isWhiteKey(i)?'whiteOff.svg':'blackOff.svg'].texture)
	key.noteId = i
	pianoKeys.addChild(key)
	key.x = getLeftPos(i)
	key.y = 0
	key.width  = isWhiteKey(i)?whiteKeyWidth :blackKeyWidth 
	key.height = isWhiteKey(i)?whiteKeyHeight:blackKeyHeight
}

function addAllKeys() {
	// add white keys first, then black key
	for(var i=startKey; i<=endKey; i++) if(isWhiteKey(i)) addKey(i)
	for(var i=startKey; i<=endKey; i++) if(isBlackKey(i)) addKey(i)
	pianoKeys.x = paddingLR
	pianoKeys.y = appHeight - paddingBottom - pianoHeight
	app.stage.addChild(pianoKeys)
}

// parse MIDI data
function modifyJson(data) {
	var events = []
	var ticksPerBeat = data.header.ticksPerBeat

	// Add header first
	events.push(data.header)
	events[0].type = 'header'
	events[0].deltaTick = 0
	events[0].deltaTime = 0
	events[0].tick = 0
	events[0].time = 0

	// Merge all tracks into one array, calculate ticks
	data.tracks.forEach((track,ti,tracks)=>{
		if (!Array.isArray(track)) return
		var tick = 0
		track.forEach((event,ei,track)=>{
			var newEvent = Object.assign({},event)
			tick += event.deltaTick
			newEvent.tick = tick
			newEvent.track = ti
			var typeAllowed = (
				newEvent.type === 'noteOn'     ||
				newEvent.type === 'noteOff'    ||
				newEvent.type === 'controller' ||
				newEvent.type === 'setTempo'
			)
			if (typeAllowed) events.push(newEvent)
		})
	})

	// Sort in ticks
	events.sort((a,b)=>a.tick-b.tick)

	// calculate time
	inProc = []
	var time = 0 // ms
	var curMsPerTick = 60000 / ticksPerBeat / defaultBpm 
	events.forEach((event,ei,events)=>{
		if(!ei) return
		time += (event.tick - events[ei-1].tick) * curMsPerTick
		event.time = time
		if (event.type === 'setTempo') {
			curMsPerTick = event.microsecondsPerBeat / ticksPerBeat / 1000
		}
	})

	// Link noteOns and noteOffs, check for missing or unnecessary noteOffs
	var inProc = []
	events.forEach((event,ei,events)=>{
		if(!event.added){

			var index = inProc.findIndex(proc=>(
				proc.noteNumber === event.noteNumber && 
				proc.channel    === event.channel    &&
				proc.track      === event.track
			))

			function noteOn() {
				var newObj = {}
				newObj.noteNumber = event.noteNumber
				newObj.channel    = event.channel
				newObj.track      = event.track
				newObj.tick       = event.tick
				inProc.push(newObj)
			}

			function noteOff(procIndex) {
				var proc = inProc[procIndex]
				var startNote = events.find(note=>(
					note.noteNumber === proc.noteNumber && 
					note.channel    === proc.channel    &&
					note.track      === proc.track      &&
					note.tick       === proc.tick
				))
				if (startNote) {
					startNote.endTick = event.tick
					startNote.endTime = event.time
					event.tickLength = startNote.tickLength = event.tick - startNote.tick
					event.timeLength = startNote.timeLength = event.time - startNote.time
					event.startTick = startNote.tick
					event.startTime = startNote.time
					inProc.splice(procIndex,1)
					return startNote
				}
				else throw "Cannot find startNote!!" // Not supposed to happen
			}

			function addNoteOff(procIndex,fl) {
				var newObj = Object.assign({},noteOff(procIndex))
				newObj.type = 'noteOff'
				newObj.velocity = 0
				newObj.tick = event.tick
				newObj.time = event.time
				newObj.added = true
				events.push(newObj)
			}

			if (event.type === 'noteOn'){
				if(index>=0) addNoteOff(index,true)
				noteOn()
			}
			else if (event.type === 'noteOff') {
				if(index>=0) noteOff(index)
				else event.ignore == true
			}
			else if (event.type === 'setTempo') {
				curMsPerTick = event.microsecondsPerBeat / ticksPerBeat / 1000
			}
		}
		// add missing noteOffs
		if (ei >= events.length-1) {
			while (inProc.length>0) addNoteOff(0,false)
			return
		}
	})

	// remove unnecessary noteOffs
	events = events.filter(e=>!e.ignore)

	// Sort in ticks
	events.sort((a,b)=>a.tick-b.tick)

	// Calculate delta
	events.forEach((event,ei,events)=>{
		if (ei>0) {
			event.deltaTick = event.tick - events[ei-1].tick
			event.deltaTime = event.time - events[ei-1].time
		}
	})

	return events
}

// note rendering
function noteAreaInit() {
	// create mask
	mask.beginFill(0xffffff)
	mask.drawRect(paddingLR, paddingTop, pianoWidth, noteAreaHeight)
	mask.endFill()

	// render notearea
	midiJson.forEach((ne,ni,na)=>{
		if (ne.type==='noteOn') {
			var i = ne.noteNumber
			var note = new Graphics()
			note.x = getLeftPos(i) + noteMarginLR
			note.y = 0 - ne.endTime * speed
			var width = (isWhiteKey(i)?whiteKeyWidth:blackKeyWidth) - noteMarginLR * 2
			var height = ne.timeLength * speed
			var r = keyRadius
			note.beginFill(noteColor[ne.track])
			note.drawRoundedRect(0,0,width,height,r)
			note.endFill(1)
			note.filters = isWhiteKey(i)?null:[dimFilter(blackNoteDim)]
			note.visible = false
			pianoNotes.addChild(note)
		}
	})
	pianoNotes.x = 0
	pianoNotes.y = noteAreaHeight
	pianoNotesArea.addChild(pianoNotes)
	pianoNotesArea.mask = mask
	pianoNotesArea.x = paddingLR
	pianoNotesArea.y = 0
	app.stage.addChild(pianoNotesArea)
	renderNotes(0)
}

// optimization (do not render things outside the area)
var renderStart = 0
var renderNum = 0
function toggleRender(obj) {
	// var yDiff = mask.toLocal(obj,mask).y
	// TODO: unknown usage toLocal
	// workaround:
	var yDiff = obj.getGlobalPosition().y - mask.getGlobalPosition().y

	var after = (yDiff+obj.height)<(0-renderBuffer)?true:false
	var before = yDiff>(mask.height+renderBuffer)?true:false
	var inside = (after||before)?false:true
	renderNum += !(obj.visible===inside)?(inside?1:-1):0
	obj.visible = inside?true:false
	return after?'after':(before?'before':'inside')
}

function renderNotes(x) {
	var listen = true
	for (var i=(x!==undefined)?x:renderStart;i<pianoNotes.children.length;i++) {
		var status = toggleRender(pianoNotes.children[i])
		if (listen && status==='inside') {
			listen = false
			renderStart = i
		}
		if (status==='after' || i>=pianoNotes.children.length-1) {
			renderEnd = i
			break
		}
		//console.log(status)
	}
}

// playback
function updateNoteArea() {
	pianoNotes.y = noteAreaHeight + (ms * accelRatio - midiDelay) * speed
}

function audioPlaybackListener() {
	if (playbackListen && ms * accelRatio>=midiDelay - audioOffset + audioDelay) {
		sound.play()
		playbackListen = false
	}
}

function updatePianoKeys() {
	while (curEventListen < midiJson.length && ms * accelRatio >= midiJson[curEventListen].time + midiDelay){
		var e = midiJson[curEventListen]
		var obj = pianoKeys.children.find(x=>x.noteId==e.noteNumber)
		if (obj) {
			var i = obj.noteId
			if (e.type === 'noteOn') {
				obj.texture = TextureCache[isWhiteKey(i)?'whiteOn.svg' :'blackOn.svg' ]
				obj.filters = [colorFilter(noteColor[e.track],keyDim)]
			}
			else if (e.type === 'noteOff') {
				obj.texture = TextureCache[isWhiteKey(i)?'whiteOff.svg':'blackOff.svg']
				obj.filters = null
			}
		}
		curEventListen ++
	}
}

/* STATES */
// timer event triggering
function gameLoop(delta) {
	frames += 1
	if(skip) {
		skip --
		ms = 0
	}
	else ms += app.ticker.elapsedMS

	secondTicker += app.ticker.elapsedMS
	if(secondTicker >= 1000.0) {
		secondUpdate()
		secondTicker %= 1000.0
	}

	frameUpdate()
}

// setup
function setup() {
	addAllKeys()
	noteAreaInit()
	// start loop, trigger events
	
	app.ticker.add(gameLoop)
	frameUpdate = play
	secondUpdate = log
	ms = 0 // Reset
}

// playback
function play() {
	audioPlaybackListener()
	updatePianoKeys()
	updateNoteArea()
	renderNotes(0)
}

function log() {
	console.log('FPS:'+app.ticker.FPS.toFixed(2))
	console.log('rendered:'+renderNum)
}

function end() {}