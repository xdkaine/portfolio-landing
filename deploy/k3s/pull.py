#!/usr/bin/python3
"""Pull public, CI-published release metadata; never execute repository scripts."""
import argparse
import fcntl
import hashlib
import json
import os
import pathlib
import re
import subprocess
import urllib.error
import urllib.request

REPOSITORY = 'xdkaine/portfolio-landing'
STATE = pathlib.Path('/var/lib/portfolio-release/state.json')
API = 'https://api.github.com/repos/' + REPOSITORY + '/releases/latest'

def fetch(url, limit):
    req = urllib.request.Request(url, headers={'User-Agent':'portfolio-release-puller/1.0','Accept':'application/vnd.github+json'})
    with urllib.request.urlopen(req, timeout=30) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Release response exceeds the size limit')
    return data

def validate(release, asset, raw):
    if release.get('draft') or release.get('prerelease'):
        raise ValueError('Production requires a published stable release')
    tag = re.fullmatch(r'production-([0-9a-f]{40})-([1-9][0-9]*)-([1-9][0-9]*)', release.get('tag_name',''))
    if not tag or release.get('author',{}).get('login') != 'github-actions[bot]':
        raise ValueError('Expected a CI-published portfolio production release')
    expected_url = 'https://github.com/' + REPOSITORY + '/releases/download/' + release['tag_name'] + '/release.json'
    if asset.get('browser_download_url') != expected_url:
        raise ValueError('Unexpected release asset source')
    if asset.get('digest') != 'sha256:' + hashlib.sha256(raw).hexdigest():
        raise ValueError('Release asset checksum mismatch')
    manifest = json.loads(raw)
    if manifest.get('schema') != 1 or manifest.get('repository') != REPOSITORY:
        raise ValueError('Unsupported release manifest')
    if manifest.get('revision') != tag[1] or str(manifest.get('runId')) != tag[2] or str(manifest.get('runAttempt')) != tag[3]:
        raise ValueError('Release identity does not match its tag')
    for key in ['appDigest','migrationDigest']:
        if not re.fullmatch(r'sha256:[0-9a-f]{64}', manifest.get(key,'')):
            raise ValueError('Release images must use immutable SHA256 digests')
    return manifest

def save(state):
    STATE.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    temp = STATE.with_suffix('.tmp')
    temp.write_text(json.dumps(state,indent=2)+'\n')
    os.chmod(temp,0o600)
    os.replace(temp,STATE)

def reconcile(release_id, manifest, state, retry=False, deploy=None, persist=save):
    if not isinstance(release_id,int) or release_id <= 0:
        raise ValueError('Invalid release ID')
    previous_id = state.get('releaseId',0)
    if release_id < previous_id:
        raise ValueError('Refusing an older release; publish a new release to roll back')
    if release_id == previous_id:
        if state.get('manifest') != manifest:
            raise ValueError('Published release metadata changed')
        if state.get('status') == 'applied':
            return
        if not retry:
            raise RuntimeError('This release previously failed or was interrupted; inspect the journal and retry explicitly')
    attempt = {'releaseId':release_id,'manifest':manifest,'status':'applying'}
    persist(attempt)
    try:
        (deploy or subprocess.run)(['/usr/local/sbin/portfolio-deploy',manifest['appDigest'],manifest['migrationDigest'],manifest['revision']],check=True)
    except Exception:
        persist({**attempt,'status':'failed'})
        raise
    persist({**attempt,'status':'applied'})
    print('Applied portfolio release',manifest['revision'])

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true',help='Validate the published release without deploying')
    parser.add_argument('--retry',action='store_true',help='Explicitly retry a failed or interrupted release after review')
    args = parser.parse_args()
    os.umask(0o077)
    try:
        release = json.loads(fetch(API,256*1024))
    except urllib.error.HTTPError as error:
        if error.code == 404:
            print('No production release published yet')
            return
        raise
    assets = [a for a in release.get('assets',[]) if a.get('name') == 'release.json' and a.get('state') == 'uploaded']
    if len(assets) != 1:
        raise ValueError('Expected one uploaded release.json asset')
    asset = assets[0]
    tag = release.get('tag_name','')
    expected_url = 'https://github.com/' + REPOSITORY + '/releases/download/' + tag + '/release.json'
    if not re.fullmatch(r'production-[0-9a-f]{40}-[1-9][0-9]*-[1-9][0-9]*',tag) or asset.get('browser_download_url') != expected_url:
        raise ValueError('Unexpected release asset URL')
    manifest = validate(release,asset,fetch(expected_url,16384))
    if args.check:
        print('Validated published portfolio release',manifest['revision'])
        return
    STATE.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (STATE.parent / 'pull.lock').open('w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        state = json.loads(STATE.read_text()) if STATE.exists() else {}
        reconcile(release['id'],manifest,state,retry=args.retry)

if __name__ == '__main__':
    main()
