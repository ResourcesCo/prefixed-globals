const util = require('util');
const exec = util.promisify(require('child_process').exec);
const readFile = util.promisify(require('fs').readFile);
const writeFile = util.promisify(require('fs').writeFile);

class Build {
  constructor() {
    this.run().then(() => null).catch(e => { console.error(e.toString()); });
  }

  async cmd(cmd) {
    console.log(`Running command: ${cmd}`);
    return await exec(cmd, { shell: true });
  }

  async listFiles(dir) {
    const { stdout } = await this.cmd(`find ${dir} -iname '*.js'`);
    return stdout.split("\n")
      .filter(s => s.length > 0)
      .filter(s => !s.startsWith(`${dir}/node_modules`))
      .filter(s => !s.startsWith(`${dir}/test`));
  }

  async replaceInFile(file) {
    const data = await readFile(file, { encoding: 'utf8' });
    let lines = data.split("\n");
    for (let i=0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('//')) {
        continue;
      }
      if (/\b(exports|module|define)\b/.test(lines[i])) {
        const original = lines[i];
        lines[i] = lines[i].replace(/typeof \b(exports|module|define)\b/g, (m, c1) => `typeof __pg_${c1}`)
        lines[i] = lines[i].replace(/\b(exports|module|define)\b\.amd/g, (m, c1) => `__pg_${c1}.amd`)
        lines[i] = lines[i].replace(/\b(exports[(]|module[(]|define[(])/g, (m, c1) => `__pg_${c1}`)
        if (/\b(exports|module|define)\b/.test(lines[i])) {
          console.log('CONTAINS MODULE GLOBAL NOT REPLACED: ', file, i, lines[i]);
        }
      }
    }
    await writeFile(file, lines.join("\n"));
  }

  async run() {
    this.config = {
      unpackDir: 'CodeMirror-5.43.0',
      dir: 'prefixed-globals-codemirror',
      releaseFile: 'CodeMirror.tar.gz',
      releaseUrl: 'https://github.com/codemirror/CodeMirror/archive/5.43.0.tar.gz'
    };
    const commands = ['downloadAndBuild', 'updateFiles'];
    const commandArg = process.argv[2];
    if (commands.includes(commandArg)) {
      await this[commandArg]();
    } else {
      commands.forEach(async command => {
        await this[command]();
      });
    }
  }

  async downloadAndBuild() {
    const {unpackDir, dir, releaseFile, releaseUrl} = this.config;
    await this.cmd(`curl -L -o ${releaseFile} ${releaseUrl}`);
    await this.cmd(`rm -rf ${unpackDir}`);
    await this.cmd(`tar xzf ${releaseFile}`);
    await this.cmd(`cd ${unpackDir} && npm install && npm run build`);
  }

  async updateFiles() {
    const {unpackDir, dir, releaseFile, releaseUrl} = this.config;
    await this.cmd(`rm -rf ${dir}`);
    await this.cmd(`cp -r ${unpackDir} ${dir}`);
    let jsFiles = await this.listFiles(dir);
    const total = jsFiles.length;
    const batchSize = 10;
    let processed = 0;
    while (jsFiles.length > 0) {
      const batch = jsFiles.splice(0, batchSize);
      await Promise.all(batch.map(file => this.replaceInFile(file)));
      processed += batch.length;
      console.log(`Processed ${processed} of ${total} files`);
    }
    let stdout;
    try {
      await this.cmd(`diff -r ${unpackDir} ${dir}`);
    } catch (err) {
      stdout = err.stdout;
    }
    console.log(`DIFF OUTPUT:\n\n${stdout}`);
    await this.cmd('cp package-specs/prefixed-globals-codemirror.json prefixed-globals-codemirror/package.json');
  }
}

new Build();
