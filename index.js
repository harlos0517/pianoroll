/* PIXI ALIAS */
const App            = PIXI.Application
const loader         = PIXI.loader
const resource       = PIXI.loader.resources
const Sprite         = PIXI.Sprite
const Container      = PIXI.Container
const TextureCache   = PIXI.utils.TextureCache
const Graphics       = PIXI.Graphics
const Ticker         = PIXI.Ticker
const filters        = PIXI.filters

/* PARAMETERS */
// layout
var pianoKeys        = new Container()
var pianoNotes       = new Container()
var pianoNotesArea   = new Container()
var mask             = new Graphics()

var keyNum           = endKey - startKey +1
var whiteKeyNum      = getWhiteKeyIndex(endKey) - getWhiteKeyIndex(startKey) + 1
var blackKeyNum      = keyNum - whiteKeyNum

var paddingTop       = resolutionHeight * paddingTratio
var paddingBottom    = resolutionHeight * paddingBratio
var paddingLR        = resolutionHeight * paddingLRratio

var pianoWidth       = resolutionWidth - paddingLR * 2
var whiteKeyWidth    = pianoWidth / whiteKeyNum
var whiteKeyHeight   = whiteKeyWidth * whiteKeyHratio
var blackKeyWidth    = whiteKeyWidth * blackKeyWratio
var blackKeyHeight   = whiteKeyWidth * blackKeyHratio
var pianoHeight      = whiteKeyHeight

var noteAreaHeight   = resolutionHeight - pianoHeight - paddingTop - paddingBottom
var noteMarginLR     = whiteKeyWidth * noteLRratio
var noteRadius       = whiteKeyWidth * noteRadiusRatio
var noteAreaInitY    = noteAreaHeight * (1 - playDelayRatio)
var noteName         = ['C','C#','D','Eb','E','F','F#','G','G#','A','Bb','B']

// app
var app

// audio
var playbackDelay    = noteAreaHeight * playDelayRatio / speed // ms
var sound

// timer and state params
var state            = 'loading'
var stateFunction    = idle
var secondUpdate     = idle
var frames           = 0
var cursor           // ms
var secondTicker     // ms
var skip             // skip frames

var midiData
var midiJson
var curEventListen
var playbackListen
var renderStart
var renderNum

/* STATES */
// playback
var states = {
	'loading': function () {
		idle()
	},
	'ready': function () {
		idle()
	},
	'play': function () {
		if(skip) skip--
		else {
			cursor += app.ticker.elapsedMS * accelRatio

			audioPlaybackListener()
			updatePianoKeys()
			updateNoteArea()
			renderNotes(0)
		}
	},
	'pause': function () {
		sound.pause()
		if (animationOnPause) {
			updatePianoKeys()
			updateNoteArea()
			renderNotes(0)
		}
	}
}

/* FUNCTIONS */
// state functions
function gameLoop(delta) {
	frames ++
	secondTicker += app.ticker.elapsedMS
	if(secondTicker >= 1000) {
		secondUpdate()
		secondTicker %= 1000
	}
	stateFunction()
}

function switchState(st) {
	var newState = states[st]
	if(!newState) throw `State '${st}' not found.`
	console.log(st)
	state = st
	stateFunction = newState	
}

function idle() {}

function log() {
	console.log('FPS:'+app.ticker.FPS.toFixed(2)+' / rendered notes:'+renderNum)
}

// setup
function setup() {
	app = new App({
		width            : resolutionWidth,
		height           : resolutionHeight,
		antialias        : antialias,
		transparent      : transparent,
		autoResize       : true,
		resolution       : 1,
		backgroundColor  : backgroundColor
	})

	/* SCALING */
	function reScale() { scaleToWindow(app.view, bodyBgColor) }
	window.addEventListener('resize',reScale)
	$('body>.wrap>#main').apnd(app.view)
	reScale()

	/* PLAYBACK CONTROL */
	$('#main').$e('click',()=>{
		if(state === 'ready' || state === 'pause') {
			playbackListen = true
			switchState('play')
		}
		else if(state === 'play') switchState('pause')
	})

	/* CONFIG EVENTS */
	$('#load').$e('click',e=>{
		if(sound) sound.stop()
		if (!$('#midfile'  ).files[0]) midiFile  = null
		else  midiFile = window.URL.createObjectURL($('#midfile').files[0])
		if (!$('#audiofile').files[0]) audioFile = null
		else {
			audioFile = window.URL.createObjectURL($('#audiofile').files[0])
			var parts = $('#audiofile').files[0].name.split('.')
			audioFormat = parts[parts.length-1]
		}

		if(!midiFile) throw 'You must upload a file!'
		loadData()
	})

	/* LOAD ASSETS */
	loader.add([
		'whiteOn.svg',
		'whiteOff.svg',
		'blackOn.svg',
		'blackOff.svg'
	]).load(()=>{
		addAllKeys()

		// start loop and log render info
		secondUpdate = log	
		app.ticker.add(gameLoop)

		loadData()
	})

}

function initParams() {
	pianoNotes.y     = noteAreaHeight - playbackDelay * speed
	cursor           = -playbackDelay // ms
	secondTicker     = 0 // ms
	skip             = skipFrameNum // skip frames
	curEventListen   = 0
	playbackListen   = false
	renderStart      = 0
	renderNum        = 0
}

function initPianoKeys() {
	pianoKeys.children.forEach((obj,ki,a)=>{
		i = obj.noteId
		obj.texture = TextureCache[isWhiteKey(i)?'whiteOff.svg':'blackOff.svg']
		obj.filters = null
	})
}

function loadData() {
	switchState('loading')

	initPianoKeys()
	initParams()

	midiData = {}
	midiJson = []

	if (midiFile){
		midi2json(midiFile,d=>{
			midiData = d
			midiJson = modifyJson(d)
			noteAreaInit()
			if(audioFile) loadAudio()
			else switchState('ready')
		})
	}
}

function loadAudio() {
	if(sound) sound.stop()
	sound = new Howl({
		src              : [audioFile],
		format           : [audioFormat],
		autoplay         : false,
		loop             : false,
		volume           : volume/Math.max(accelRatio,1),
		rate             : accelRatio,
	})

	sound.once('load',()=>{
		switchState('ready')
	})

	sound.once('loaderror',(e,msg)=>{
		console.log('Unable to load file: ' + name + ' | error message : ' + msg);
		console.log('First argument error ' + e);
	})

	sound.once('end',()=>{
		initParams()
		switchState('ready')
	})

	sound.load()
}

// color filter function
function getColor(track, channel) {
	var trNum = noteColor.length
	var chNum = noteColor[track%trNum].length
	return noteColor[track%trNum][channel%chNum]
}

function colorFilter(hex,dim) {
	let filter = new filters.ColorMatrixFilter()
	var R = Math.floor(hex/256 /256)/ 255 * dim
	var G = Math.floor(hex/256)%256 / 255 * dim
	var B =            hex     %256 / 255 * dim
	filter.matrix = [
		R, 0, 0, 0, 0,
		0, G, 0, 0, 0,
		0, 0, B, 0, 0,
		0, 0, 0, 1, 0]
	return filter
}

function dimFilter(v) {
	let filter = new filters.ColorMatrixFilter()
	filter.matrix = [
		v, 0, 0, 0, 0,
		0, v, 0, 0, 0,
		0, 0, v, 0, 0,
		0, 0, 0, 1, 0]
	return filter
}

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
	pianoKeys.y = resolutionHeight - paddingBottom - pianoHeight
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
	pianoNotes.destroy({children:true, texture:true, baseTexture:true})
	pianoNotes = new Container()

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
			note.beginFill(getColor(ne.track,ne.channel))
			note.drawRoundedRect(0,0,width,height,noteRadius)
			note.endFill(1)
			note.filters = isWhiteKey(i)?null:[dimFilter(blackNoteDim)]
			note.visible = false
			pianoNotes.addChild(note)
		}
	})
	pianoNotes.x = 0
	pianoNotes.y = noteAreaHeight - playbackDelay * speed
	pianoNotesArea.addChild(pianoNotes)
	pianoNotesArea.mask = mask
	pianoNotesArea.x = paddingLR
	pianoNotesArea.y = 0
	app.stage.addChild(pianoNotesArea)
	renderNotes(0)
}

// optimization (do not render things outside the area)

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
	pianoNotes.y = noteAreaHeight + cursor * speed
}

function audioPlaybackListener() {
	if (playbackListen && cursor >= audioDelay/accelRatio - audioOffset) {
		sound.seek((cursor + audioOffset - audioDelay/accelRatio)/1000)
		sound.play()
		playbackListen = false
	}
}

function updatePianoKeys() {
	while (curEventListen < midiJson.length && cursor >= midiJson[curEventListen].time){
		var e = midiJson[curEventListen]
		var obj = pianoKeys.children.find(x=>x.noteId==e.noteNumber)
		if (obj) {
			var i = obj.noteId
			if (e.type === 'noteOn') {
				obj.texture = TextureCache[isWhiteKey(i)?'whiteOn.svg' :'blackOn.svg' ]
				obj.filters = [colorFilter(getColor(e.track,e.channel),keyDim)]
			}
			else if (e.type === 'noteOff') {
				obj.texture = TextureCache[isWhiteKey(i)?'whiteOff.svg':'blackOff.svg']
				obj.filters = null
			}
		}
		curEventListen ++
	}
}

//run.
setup()