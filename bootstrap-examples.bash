#!/bin/bash

for d in examples/* ; do
    cd $d
    npm install
    cd ../../
done
