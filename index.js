#!/usr/bin/env node

const fs = require('fs-extra');
const Confirm = require('prompt-confirm');
const editJsonFile = require('edit-json-file');
const { exec } = require('child_process');
const commandExists = require('command-exists').sync;
const Ora = require('ora');
const name = process.argv[2] || 'new-project';
const projectPath = `./${name}`;
require('colors');


// Log package version number
if (name === '-v') {
  console.log(require('./package.json').version);
  process.exit();
}

if (fs.existsSync(projectPath)) {
  console.log('The folder '.yellow + `/${name}`.magenta.bold + ' already exists. Creating a project here will erase the previous contents of that folder.\n'.yellow)
  const prompt = new Confirm('Would you like to continue?');

  prompt.ask(answer => {
    if (answer) {
      fs.emptyDir(projectPath, error => {
        if (error) {
          console.error(error);
        } else {
          process.stdout.write('\n');
          createProject();
        }
      });
    }
  });
} else {
  createProject();
}

function createProject() {
  const spinner = new Ora({
    text: 'Creating project...'.yellow.bold
  });

  spinner.start();

  fs.copy(`${__dirname}/boilerplate`, name, error => {
    if (error) {
      spinner.fail('Unable to create project\n'.red.bold);
      console.log(error);
    } else {
      
      const file = editJsonFile(`${projectPath}/package.json`);
      file.set('name', name);
      file.save();

      spinner.succeed('Project created'.bold);

      const installDependencies = () => {
        if (!commandExists('npm')) {
          spinner.warn('Unable to install dependencies, npm is not installed\n'.yellow);
          console.log('\n✅  Done!\n'.bold.green);
        } else {
          spinner.start('Installing dependencies'.cyan.bold);

          exec(`npm install`, { cwd: projectPath }, (error, stdout, stderr) => {
            if (error) {
              spinner.warn('Your project was created but there was a problem installing dependencies');
              console.log('\nYou can install them manually by running ' + 'npm install'.cyan + ' in your project folder.');
            } else {
              const packageText = stdout.match(/(added.*\ds)/);

              if (packageText && packageText.length) {
                const text = packageText[0].charAt(0).toUpperCase() + packageText[0].slice(1);
                spinner.succeed(text.bold);
              } else {
                spinner.succeed('Dependencies already installed');
              }
            }

            console.log('\n✅  Done!\n'.bold.green);
            console.log('To start the development servier run ' + 'npm run start'.cyan + ' in your project folder.\n');
          });
        }
      }

      // Initialize git repository
      if (!commandExists('git')) {
        spinner.warn('Unable to intialize repository, git is not installed'.yellow);
        installDependencies();
      } else {
        exec(`git init`, { cwd: projectPath }, (error, stdout, stderr) => {
          if (error) {
            spinner.warn('Your project was created but there was a problem installing dependencies');
            console.log('\nYou can install them manually by running ' + 'npm install'.cyan + ' in your project folder.');
          } else {
            fs.writeFileSync(`${projectPath}/.gitignore`, 'node_modules/\ndist/', { cwd: projectPath });

            spinner.succeed('Initialized git repository!'.bold);
            installDependencies();
          }
        });
      }
    }
  });
}