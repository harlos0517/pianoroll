# Piano roll

An open-source MIDI note visualizing webpage.

![Demo Image](https://DeemoHarlos.github.io/pianoroll/demo.png)

## ~~What it does~~ What it sould do

Converts a midi file into piano roll presentation, with audio.

## Usage

Currently ( v0.1 ) , changing midi file is unavailable, since `midifile.json` is generated manually by myself.

## Dependencies ( v0.1 )
* [pixi.js](http://www.pixijs.com/) `v4.8.5`
* [scaleToWindow.js](https://github.com/kittykatattack/scaleToWindow) `bc43fe7`
* [howler.js](https://howlerjs.com/) `v2.1.1`

## Struture ( v0.1 )

### HTML/CSS
* `index.html`
	* `structure.css`
	* `index.css`

### JS
* `general.js` ( Custom defined selector alias )
* `pixi.min.js`
* `howler.min.js`
* `scaleToWindow.js`

### Assets
* Audio
	* `deerstalker.mp3`

* midi data ( in JSON format )
	* `midifile.json`

* images ( from [Musescore.com](https://musescore.com) )
	* `whiteKeyDefault.svg`
	* `whiteKeyPressed.svg`
	* `whiteKeyActiveLeft.svg`
	* `whiteKeyActiveRight.svg`
	* `blackKeyDefault.svg`
	* `blackKeyPressed.svg`
	* `blackKeyActiveLeft.svg`
	* `blackKeyActiveRight.svg`
	* `revoltfx-spritesheet.png`
		* `revoltfx-spritesheet.json`

### Main code ( `index.js` )
1. PIXI function and constructor aliases

2. Configuration
	* Piano roll layout
	* MIDI playback
	* PIXI app settings
	* Howler sound settings

3. Parameters declaration
	* timers
	* PIXI Sprites, Containers, masks

4. Scaling to window size

5. Load Assets

6. Functions
	* Note function
		* `isWhiteKey(i)` ( `boolean` )
		* `isBlackKey(i)` ( `boolean` )
		* `getNoteName(i)` ( `string` )

	* Piano roll rendering
		* `getWhiteKeyIndex(i)` ( `number` )
		* `getLeftPos(i)` ( `number` in `px` )
		* `addKey(i)`
		* `addAllKeys`

	* Parse JSON data ( TODO: Convert a MIDI ( `*.mid` ) file into JSON ( `*.json` ) format directly. )
		* `parseMidi(midi)` ( `Array` )

	* note rendering
		* `noteAreaInit()`
		* `toggleRender(obj)` ( `string` : 'after'|'before'|'inside' )
		* `renderNotes(x)`

	* Playback
		* `updateNoteArea()`
		* `audioPlaybackListener()`
		* `updatePianoKeys()`

7. main code
	* `gameLoop(delta)` ( Triggers timer events )
	* `setup()` ( Setup bfore playback )
	* `play()` ( Playback )
	* `log()` ( `console.log`s FPS and the number of rendered notes )
	* `end()` ( Empty function, unsed )

## Author
### Deemo Harlos
* [Facebook](https://facebook.com/deemoharlos.music/)
* [YouTube](https://youtube.com/c/deemoharlos)
* [Instagram](https://instagram.com/deemo_harlos/)
* [Github](https://github.com/DeemoHarlos)
* [Musescore](https://musescore.com/deemo_harlos)
