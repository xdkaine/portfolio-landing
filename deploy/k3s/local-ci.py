"""Local CI preserves regression gates and keeps packages on NFS."""
import pathlib,os,subprocess,json,shutil,time
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
os.environ.update({'CI':'true','DATABASE_URL':'postgresql://dummy:dummy@localhost:5432/dummy','JWT_SECRET':'ci-only-session-secret-0123456789abcdef','TURNSTILE_SITE_KEY':'ci-site-key','TURNSTILE_SECRET_KEY':'ci-secret-key','npm_config_cache':str(base/'npm-cache'),'PLAYWRIGHT_BROWSERS_PATH':str(base/'browsers'),'PLAYWRIGHT_TEST_BASE_URL':'http://127.0.0.1:18089'})
if branch=='dev':os.environ.update({'NEXT_PUBLIC_SITE_URL':'https://portfolio-dev.devops.home.phao.dev','NEXT_PUBLIC_TURNSTILE_SITE_KEY':'1x00000000000000000000AA'})
compose=['docker','compose','-p','portfolio-ci','-f','docker-compose.test.yml']
try:
 run('npm','ci')
 run('npx','tsc','--noEmit')
 run('npm','run','lint')
 run('npm','test')
 run('python3','-m','unittest','discover','-s','deploy/k3s/tests','-v')
 run('npm','audit','--audit-level=high')
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
 subprocess.run([*compose,'down','-v','--remove-orphans'])
 subprocess.run(['docker','image','prune','--all','--force'])
