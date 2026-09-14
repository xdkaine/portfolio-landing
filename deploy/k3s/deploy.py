#!/usr/bin/python3
"""Root-owned, fixed-scope deployment entrypoint for the release puller."""
import datetime, fcntl, json, os, pathlib, re, subprocess, sys, urllib.request

K = ['/usr/local/bin/kubectl', '--cache-dir=/var/lib/portfolio-release/kube-cache', '-n', 'portfolio']
os.environ['KUBECONFIG'] = '/etc/rancher/k3s/k3s.yaml'
os.environ['PATH'] = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
def run(*args, **kwargs):
    return subprocess.run([*K, *args], check=True, **kwargs)
def get(*args):
    return subprocess.check_output([*K, *args])
def image(digest):
    if not re.fullmatch(r'sha256:[0-9a-f]{64}', digest):
        raise ValueError('Expected an immutable SHA256 image digest')
    return 'docker.io/library/portfolio-local@' + digest
def main():
    if len(sys.argv) != 4 or not re.fullmatch('[0-9a-f]{40}', sys.argv[3]):
        raise ValueError('Usage: portfolio-deploy APP_DIGEST MIGRATION_DIGEST REVISION')
    app, migration, revision = image(sys.argv[1]), image(sys.argv[2]), sys.argv[3]
    os.umask(0o077)
    with open('/var/lock/portfolio-deploy.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        backup = pathlib.Path('/var/backups/portfolio-deploy')
        backup.mkdir(mode=0o700, exist_ok=True)
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        with (backup / (stamp + '-' + revision + '.dump')).open('wb') as f:
            run('exec','deployment/db','--','pg_dump','-U','xtomm','-d','portfolio','-Fc',stdout=f)
        # Never automatically restore a database over writes made after a release.
        previous = json.loads(get('get','deployment','app','-o','json'))['spec']['template']['spec']['containers'][0]['image']
        job = 'migrate-' + revision[:12] + '-' + stamp.lower()
        manifest = {'apiVersion':'batch/v1','kind':'Job','metadata':{'name':job,'namespace':'portfolio'},'spec':{'backoffLimit':0,'activeDeadlineSeconds':300,'ttlSecondsAfterFinished':86400,'template':{'metadata':{'labels':{'app':'app'}},'spec':{'restartPolicy':'Never','automountServiceAccountToken':False,'securityContext':{'runAsUser':1001,'runAsGroup':1001,'runAsNonRoot':True,'seccompProfile':{'type':'RuntimeDefault'}},'containers':[{'name':'migrate','image':migration,'envFrom':[{'secretRef':{'name':'app-env'}}],'securityContext':{'allowPrivilegeEscalation':False,'readOnlyRootFilesystem':True,'capabilities':{'drop':['ALL']}},'resources':{'requests':{'cpu':'50m','memory':'128Mi'},'limits':{'cpu':'1','memory':'512Mi'}},'volumeMounts':[{'name':'tmp','mountPath':'/tmp'}]}],'volumes':[{'name':'tmp','emptyDir':{'sizeLimit':'64Mi'}}]}}}}
        run('create','-f','-',input=json.dumps(manifest).encode())
        run('wait','--for=condition=complete','job/'+job,'--timeout=310s')
        try:
            run('set','image','deployment/app','app='+app)
            run('rollout','status','deployment/app','--timeout=180s')
            ip=json.loads(get('get','service','nginx','-o','json'))['spec']['clusterIP']
            for url in ['http://'+ip+'/v1/api/health','https://phao.dev/v1/api/health']:
                req=urllib.request.Request(url,headers={'Cache-Control':'no-cache','User-Agent':'portfolio-deploy/1.0'})
                with urllib.request.urlopen(req,timeout=30) as r: body=json.load(r)
                if body.get('status')!='ok' or body.get('revision')!=revision:
                    raise RuntimeError('Release health/revision mismatch')
            with urllib.request.urlopen('http://'+ip+'/v1/api/turnstile',timeout=20) as r: config=json.load(r)
            if config.get('required') and not config.get('siteKey'):
                raise RuntimeError('Turnstile site key missing')
        except Exception:
            run('set','image','deployment/app','app='+previous)
            run('rollout','status','deployment/app','--timeout=180s')
            raise
        print('Verified portfolio release',revision)
        print('Database recovery copy:',backup/(stamp+'-'+revision+'.dump'))
if __name__ == '__main__':
    main()
