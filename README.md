# Piano roll

An open-source MIDI note visualizing webpage.

![Demo Image](https://DeemoHarlos.github.io/pianoroll/demo.png)

## What it does

Converts a midi file into piano roll presentation, with customly uploaded audio.

## Usage
* Roll down the webpage and click 'Upload MIDI', and choose the midi file you want to upload.
* (Optional) click 'Upload Audio' and choose the audio you want to play along with the MIDI presentation.
* Click 'Load' to start loading.
* When it's ready (Currently, the status can only be seen in console.log (F12)), Click the video to start.
* Enjoy the music and video!

## Dependencies ( `e515f30` )
* [pixi.js](http://www.pixijs.com/) `v4.8.5`
* [howler.js](https://howlerjs.com/) `v2.1.1`
* [scaleToWindow.js](https://github.com/kittykatattack/scaleToWindow) (modified) `bc43fe7`
* [midi-file](https://github.com/carter-thaxton/midi-file) (modified) `3490136`

## Struture ( `e515f30` )

### HTML/CSS
* `index.html`
	* `structure.css`
	* `index.css`

### JS
* `general.js` ( Custom defined selector alias )
* `pixi.min.js`
* `howler.min.js`
* `scaleToWindow.js`
* `midi2json.js`
* `scaleToWindow.js`
* `config.js` ( Configuration )

### Assets
* demo (default midi and audio source) ( [Music source](https://www.youtube.com/watch?v=BGzIIVYzUkY) )
	* `demo.mid`
	* `demo.mp3`

* images ( from [Musescore.com](https://musescore.com) )
	* `whiteOn.svg`
	* `whiteOff.svg`
	* `blackOn.svg`
	* `blackOff.svg`

### Main code ( `index.js` )
* PIXI function and constructor aliases

* Pianoroll()
1. Parameters
2. `states` ( `object` )
3. `setup()`
4. `gameLoop(delta)`
5. `switchState(st)`
6. `idle()`
7. `log()`
8. `rescale()`
9. `loadConfig()`
10. `initParams()`
11. `initKeys()`
12. `loadData()`
13. `loadAudio()`
14. `getColor(track, channel)`
15. `colorFilter(hex,dim)`
16. `dimFilter(v)`
17. `isWhiteKey(i)`
18. `isBlackKey(i)`
19. `getWhiteKeyIndex(i)`
20. `getLeftPos(i)`
21. `addKey(i)`
22. `addAllKeys()`
23. `modifyJson(data)`
24. `noteAreaInit()`
25. `toggleRender(obj)`
26. `renderNotes(x)`
27. `updateNoteArea()`
28. `audioPlaybackListener() `
29. `updateKeys()`

* Run! Call `PianoRoll()`

## Author
### Deemo Harlos
* [YouTube](https://youtube.com/c/deemoharlos)
* [Musescore](https://musescore.com/deemo_harlos)
* Support me on [Patreon](https://patreon.com/DeemoHarlos)!
* [Github](https://github.com/DeemoHarlos)
* [Facebook](https://facebook.com/deemoharlos.music/)
* [Instagram](https://instagram.com/deemo_harlos/)
