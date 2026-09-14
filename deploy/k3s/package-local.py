"""Package tested images on NFS without a registry or GitHub artifact upload."""
import gzip,hashlib,json,os,pathlib,subprocess,shutil,sys
images={};revision=os.environ['GITHUB_SHA'];branch=os.environ['GITHUB_REF_NAME']
for spec in sys.argv[1:]:
 name,image=spec.split('=',1);archive=pathlib.Path('release')/(name+'.tar.gz')
 process=subprocess.Popen(['docker','save',image],stdout=subprocess.PIPE)
 with gzip.open(archive,'wb',compresslevel=1) as output:shutil.copyfileobj(process.stdout,output)
 assert process.wait()==0
 info=json.loads(subprocess.check_output(['docker','image','inspect',image]))[0]
 with archive.open('rb') as f:digest=hashlib.file_digest(f,'sha256').hexdigest()
 images[name]={'image':image,'config':info['Id'],'sha256':digest,'size':archive.stat().st_size,'unpacked':info['Size']}
pathlib.Path('release/release.json').write_text(json.dumps({'revision':revision,'branch':branch,'images':images},indent=2))
