#!/bin/bash

for d in examples/* ; do
    cd $d
    npm i
    cd ../../
done