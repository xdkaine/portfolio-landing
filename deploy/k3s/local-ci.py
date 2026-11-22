"""Local CI preserves regression gates and keeps packages on NFS."""
import pathlib,os,subprocess,json,shutil,time,tempfile
key=os.environ['LOCAL_CI_KEY'];rev=os.environ['GITHUB_SHA'];branch=os.environ['GITHUB_REF_NAME']
def run(*a,**kw):subprocess.run(a,check=True,**kw)
base=pathlib.Path('/srv/ci-artifacts')/key
assert base.is_dir(),'NFS is required'
output=base/'releases'/branch/rev;output.mkdir(parents=True,exist_ok=True)
link=base/'release'
if link.is_symlink():link.unlink()
assert not link.exists();link.symlink_to(output)
local=pathlib.Path('release')
if local.is_symlink():local.unlink()
if local.exists():local.rmdir()
local.symlink_to(output)
assert subprocess.check_output(['docker','info','--format','{{.Host.Security.Rootless}}']).strip()==b'true'
assert shutil.disk_usage('/').free>10*1024**3,'Core disk reserve is required'
os.environ.update({'CI':'true','DATABASE_URL':'postgresql://dummy:dummy@localhost:5432/dummy','JWT_SECRET':'ci-only-session-secret-0123456789abcdef','TURNSTILE_SITE_KEY':'ci-site-key','TURNSTILE_SECRET_KEY':'ci-secret-key','npm_config_cache':str(base/'npm-cache'),'PLAYWRIGHT_BROWSERS_PATH':str(base/'browsers'),'PLAYWRIGHT_TEST_BASE_URL':'https://127.0.0.1:18089'})
if branch=='dev':os.environ.update({'NEXT_PUBLIC_SITE_URL':'https://portfolio-dev.devops.home.phao.dev','NEXT_PUBLIC_TURNSTILE_SITE_KEY':'1x00000000000000000000AA'})
compose=['docker','compose','-p','portfolio-ci','-f','docker-compose.test.yml']
tls=tempfile.TemporaryDirectory(prefix='portfolio-ci-tls-')
os.environ['PORTFOLIO_CI_TLS_DIR']=tls.name
try:
 run('openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost','-keyout',tls.name+'/key.pem','-out',tls.name+'/cert.pem',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 pathlib.Path(tls.name+'/key.pem').chmod(0o600)
 run('npm','ci')
 run('npx','tsc','--noEmit')
 run('npm','run','lint')
 run('npm','test')
 run('python3','-m','unittest','discover','-s','deploy/k3s/tests','-v')
 run('npm','audit','--audit-level=high')
 run(*compose,'up','-d','--wait','db')
 run(*compose,'exec','-T','db','createdb','-U','xtomm','cms_test')
 cms_url='postgresql://xtomm:testpassword@127.0.0.1:18090/cms_test'
 cms_env={**os.environ,'DATABASE_URL':cms_url,'CMS_TEST_DATABASE_URL':cms_url}
 run('npx','prisma','migrate','deploy',env=cms_env)
 run('npm','run','test:cms',env=cms_env)
 run(*compose,'up','--build','-d','--wait')
 run('npx','playwright','install','chromium')
 run('npm','run','test:e2e')
 run(*compose,'down','-v','--remove-orphans')
 for name,target in [('app','runner'),('migrate','migrate')]:
  run('docker','build','--target',target,'--build-arg','APP_REVISION='+rev,'--build-arg','NEXT_PUBLIC_SITE_URL='+os.environ.get('NEXT_PUBLIC_SITE_URL','https://phao.dev'),'--build-arg','NEXT_PUBLIC_TURNSTILE_SITE_KEY='+os.environ.get('NEXT_PUBLIC_TURNSTILE_SITE_KEY',''),'-t','portfolio-'+name+':'+rev,'.')
 run('python3','deploy/k3s/package-local.py','app=portfolio-app:'+rev,'migrate=portfolio-migrate:'+rev)
 run('docker','image','prune','--all','--force')
 if branch in ['main','dev']:run('python3','deploy/k3s/submit-local.py')
except Exception:
 subprocess.run([*compose,'logs','--tail=80'])
 raise
finally:
 # Preserve browser evidence on NFS even when a test fails, before cleanup.
 try:
  checks=output/'checks'/(os.environ.get('GITHUB_RUN_ID','local')+'-'+os.environ.get('GITHUB_RUN_ATTEMPT','1'))
  for name in ['playwright-report','test-results','coverage-reports']:
   source=pathlib.Path(name)
   if source.is_dir():
    checks.mkdir(parents=True,exist_ok=True)
    shutil.copytree(source,checks/name,dirs_exist_ok=True)
  summary=os.environ.get('GITHUB_STEP_SUMMARY')
  if summary and checks.exists():
   with open(summary,'a') as report:report.write('\nBrowser reports retained on the VM: `'+str(checks)+'`\n')
 except Exception as error:
  print('Browser report retention failed:',error,flush=True)
 subprocess.run([*compose,'down','-v','--remove-orphans'])
 tls.cleanup()
 subprocess.run(['docker','image','prune','--all','--force'])
