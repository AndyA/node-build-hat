#!/bin/bash

socat /dev/serial0,raw,echo=0 \
  SYSTEM:'tee in.txt | socat - "PTY,link=/tmp/ttyV0,raw,echo=0,waitslave" | tee out.txt'

# vim:ts=2:sw=2:sts=2:et:ft=sh

