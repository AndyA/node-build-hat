#!/usr/bin/env python

from buildhat import Hat, Motor

Hat(debug=True)

m = Motor('A')

m.run_for_seconds(5, 100)

# vim:ts=2:sw=2:sts=2:et:ft=python

