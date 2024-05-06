#!/bin/bash

(cd L:/Archive/Homestuck/Nebula && . build.sh && hsmusic --repl) < hsmusic_repl_in.js

cp -v L:/Archive/Homestuck/Nebula/code/src/hsmusic_out.json ../src/imods/_twoToThree/hsmusic.json