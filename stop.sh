#!/bin/bash
PROCESS='spcplayerbot'
PARENT=$(screen -ls | awk '/\.'$PROCESS'\t/ {print $1 + 0}') || 0
if [ -z "$PARENT" ]
then
    echo 'Nothing to stop.'
else
    echo $PARENT
    PID=$(ps h --ppid $(ps h --ppid $PARENT -o pid) -o pid)
    kill -INT $PID
fi