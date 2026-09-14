#!/bin/sh
set -eu
# Use this disposable container's DNS under both Docker and rootless Podman.
resolver="$(awk '$1 == "nameserver" { print $2; exit }' /etc/resolv.conf)"
case "$resolver" in ''|*[!0-9a-fA-F:.]*) echo 'Invalid container DNS resolver' >&2; exit 1 ;; esac
case "$resolver" in *:*) resolver="[$resolver]" ;; esac
sed "s/resolver 127.0.0.11 /resolver $resolver /" /etc/nginx/portfolio/nginx.conf > /tmp/nginx-ci.conf
exec nginx -g 'daemon off;' -c /tmp/nginx-ci.conf
