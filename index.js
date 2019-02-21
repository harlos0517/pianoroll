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

const PianoRoll = function () {
	// params
	var app, sound, midi, audio
	var defaultBpm, playDelayRatio, speed, playbackDelay
	var startKey, endKey, keyNum, whiteKeyNum, blackKeyNum
	var padding, key, piano, note, noteArea
	var keyDim, blackNoteDim, noteColor
	var resolution, renderBuffer, skipFrameNum

	var keys          = new Container()
	var notes         = new Container()
	var notesArea     = new Container()
	var mask          = new Graphics()

	var state         = 'loading'
	var stateFunction = idle
	var secondUpdate  = idle
	var frames        = 0
	var cursor

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
				cursor += app.ticker.elapsedMS * config.accelRatio

				audioPlaybackListener()
				updateKeys()
				updateNoteArea()
				renderNotes(0)
			}
		},
		'pause': function () {
			sound.pause()
			if (config.animationOnPause) {
				updateKeys()
				updateNoteArea()
				renderNotes(0)
			}
		}
	}

	function setup() {
		loadConfig()

		/* SCALING */
		window.addEventListener('resize',rescale)
		$('body>.wrap>#main').apnd(app.view)
		rescale()

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

			if (!$('#midifile' ).files[0]) midi.file  = null
			else  midi.file = window.URL.createObjectURL($('#midifile').files[0])

			if (!$('#audiofile').files[0]) audio.file = null
			else {
				audio.file = window.URL.createObjectURL($('#audiofile').files[0])
				var parts = $('#audiofile').files[0].name.split('.')
				audio.format = parts[parts.length-1]
			}

			if(!midi.file) throw 'You must upload a file!'
			else loadData()
		})

		$('#midifile').$e('change',e=>{
			$('#midifile-label>span' ).innerHTML = $('#midifile' ).files[0]?$('#midifile' ).files[0].name:'Upload MIDI'
		})

		$('#audiofile').$e('change',e=>{
			$('#audiofile-label>span').innerHTML = $('#audiofile').files[0]?$('#audiofile').files[0].name:'Upload Audio'
		})

		/* LOAD ASSETS */
		loader.add([
			'whiteOn.svg',
			'whiteOff.svg',
			'blackOn.svg',
			'blackOff.svg'
		]).load(()=>{
			// start loop and log render info
			secondUpdate = log	
			app.ticker.add(gameLoop)

			loadData()
			addAllKeys()
		})
	}

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

	function idle() {
	}

	function log() {
		console.log('FPS:'+app.ticker.FPS.toFixed(2)+' / rendered notes:'+renderNum)
	}

	function rescale() {
		scaleToWindow(app.view)
	}

	function loadConfig() {
		midi = {
			'file'         : config.midi.file
		}

		defaultBpm       = config.defaultBpm
		playDelayRatio   = config.playDelayRatio
		speed            = config.speed

		audio = {
			'file'         : config.audio.file,
			'format'       : config.audio.format,
			'offset'       : config.audio.offset,
			'delay'        : config.audio.delay
		}

		resolution = {
			'width'        : config.resolution.width,
			'height'       : config.resolution.height
		}

		startKey         =  21
		endKey           = 108
		keyNum           = config.endKey - config.startKey +1
		whiteKeyNum      = getWhiteKeyIndex(config.endKey) - getWhiteKeyIndex(config.startKey) + 1
		blackKeyNum      = keyNum - whiteKeyNum

		padding = {}
		padding.top      = resolution.height * config.paddingRatio.top
		padding.bottom   = resolution.height * config.paddingRatio.bottom
		padding.side     = resolution.height * config.paddingRatio.side

		piano = {}
		key = {
			'white' : {},
			'black' : {}
		}
		piano.width      = resolution.width - padding.side * 2
		key.white.width  = piano.width / whiteKeyNum,
		key.white.height = key.white.width * config.keyRatio.white.height
		key.black.width  = key.white.width * config.keyRatio.black.width
		key.black.height = key.white.width * config.keyRatio.black.height
		piano.height     = key.white.height

		note = {}
		note.margin      = key.white.width * config.noteRatio.margin
		note.radius      = key.white.width * config.noteRatio.radius

		noteArea = {}
		noteArea.height  = resolution.height - piano.height - padding.top - padding.bottom,
		noteArea.initPos = noteArea.height * (1 - config.playDelayRatio)

		playbackDelay    = noteArea.height * config.playDelayRatio / config.speed

		keyDim           = config.keyDim
		blackNoteDim     = config.blackNoteDim
		noteColor        = config.noteColor

		if (app) {		
			app.renderer.resize(resolution.width,resolution.height)
			app.renderer.backgroundColor = config.backgroundColor
			app.renderer.antialias       = config.antialias
			app.renderer.transparent     = config.transparent
		}
		else {
			app = new App({
				width        : resolution.width,
				height       : resolution.height,
				antialias    : config.antialias,
				transparent  : config.transparent,
				autoResize   : true,
				resolution   : 1,
			})
		}

		renderBuffer    = config.renderBuffer
		skipFrameNum    = config.skipFrameNum
	}

	function initParams() {
		notes.y         = noteArea.height - playbackDelay * config.speed
		cursor          = -playbackDelay
		secondTicker    = 0 // ms
		skip            = config.skipFrameNum
		curEventListen  = 0
		playbackListen  = false
		renderStart     = 0
		renderNum       = 0
	}

	function initKeys() {
		keys.children.forEach((obj,ki,a)=>{
			i = obj.noteId
			obj.texture = TextureCache[isWhiteKey(i)?'whiteOff.svg':'blackOff.svg']
			obj.filters = null
		})
	}

	function loadData() {
		switchState('loading')

		initParams()
		initKeys()

		midiData = {}
		midiJson = []

		if (midi.file){
			midi2json(midi.file,d=>{
				midiData = d
				midiJson = modifyJson(d)
				noteAreaInit()
				if(audio.file) loadAudio()
				else switchState('ready')
			})
		}
	}

	function loadAudio() {
		if(sound) sound.stop()
		sound = new Howl({
			src              : [audio.file],
			format           : [audio.format],
			autoplay         : false,
			loop             : false,
			volume           : config.audio.volume/Math.max(config.accelRatio,1),
			rate             : config.accelRatio,
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

	function isWhiteKey(i) {
		var mod = i % 12
		return (mod==0 || mod==2 || mod==4 || mod==5 || mod==7 || mod==9 || mod==11)
	}

	function isBlackKey(i) {
		return !isWhiteKey(i)
	}

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
		return key.white.width*dist-(isWhiteKey(i)?0:(key.black.width/2))
	}

	function addKey(i) {
		var newKey = new Sprite(resource[isWhiteKey(i)?'whiteOff.svg':'blackOff.svg'].texture)
		newKey.noteId = i
		keys.addChild(newKey)
		newKey.x = getLeftPos(i)
		newKey.y = 0
		newKey.width  = key[isWhiteKey(i)?'white':'black'].width
		newKey.height = key[isWhiteKey(i)?'white':'black'].height
	}

	function addAllKeys() {
		// add white keys first, then black key
		for(var i=startKey; i<=endKey; i++) if(isWhiteKey(i)) addKey(i)
		for(var i=startKey; i<=endKey; i++) if(isBlackKey(i)) addKey(i)
		keys.x = padding.side
		keys.y = resolution.height - padding.bottom - piano.height
		app.stage.addChild(keys)
	}

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

	function noteAreaInit() {
		notes.destroy({children:true, texture:true, baseTexture:true})
		notes = new Container()

		// create mask
		mask.beginFill(0xffffff)
		mask.drawRect(padding.side, padding.top, piano.width, noteArea.height)
		mask.endFill()

		// render notearea
		midiJson.forEach((ne,ni,na)=>{
			if (ne.type==='noteOn') {
				var i = ne.noteNumber
				var newNote = new Graphics()
				newNote.x = getLeftPos(i) + note.margin
				newNote.y = 0 - ne.endTime * speed
				var width = (key[isWhiteKey(i)?'white':'black'].width) - note.margin * 2
				var height = ne.timeLength * speed
				newNote.beginFill(getColor(ne.track,ne.channel))
				newNote.drawRoundedRect(0,0,width,height,note.radius)
				newNote.endFill(1)
				newNote.filters = isWhiteKey(i)?null:[dimFilter(blackNoteDim)]
				newNote.visible = false
				notes.addChild(newNote)
			}
		})
		notes.x = 0
		notes.y = noteArea.height - playbackDelay * speed
		notesArea.addChild(notes)
		notesArea.mask = mask
		notesArea.x = padding.side
		notesArea.y = 0
		app.stage.addChild(notesArea)
		renderNotes(0)
	}

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
		for (var i=(x!==undefined)?x:renderStart;i<notes.children.length;i++) {
			var status = toggleRender(notes.children[i])
			if (listen && status==='inside') {
				listen = false
				renderStart = i
			}
			if (status==='after' || i>=notes.children.length-1) {
				renderEnd = i
				break
			}
			//console.log(status)
		}
	}

	function updateNoteArea() {
		notes.y = noteArea.height + cursor * speed
	}

	function audioPlaybackListener() {	
		if (playbackListen && cursor >= audio.delay - audio.offset) {
			sound.seek((cursor + audio.offset - audio.delay)/1000)
			sound.play()
			playbackListen = false
		}
	}

	function updateKeys() {
		while (curEventListen < midiJson.length && cursor >= midiJson[curEventListen].time){
			var e = midiJson[curEventListen]
			var obj = keys.children.find(x=>x.noteId==e.noteNumber)
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

	return setup()
}

PianoRoll()