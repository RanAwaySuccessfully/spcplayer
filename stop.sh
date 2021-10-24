#!/bin/bash
PROCESS='spcplayerbot'
PARENT=$(screen -ls | awk '/\.'$PROCESS'\t/ {print $1 + 0}') || 0
if [[ 0 -ne $PARENT ]]
then
    PID=$(ps h --ppid $(ps h --ppid $PARENT -o pid) -o pid)
    kill -INT $PID
else
    echo 'Nothing to stop.'
fi