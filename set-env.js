const { Client } = require('ssh2');
const crypto = require('crypto');

const CRON_SECRET = crypto.randomBytes(32).toString('hex');
console.log('Generated CRON_SECRET:', CRON_SECRET);

const conn = new Client();
conn.on('ready', () => {
  // Use Coolify's artisan to properly encrypt and set env var values
  const script = `
    $app = \\App\\Models\\Application::find(35);
    $vars = $app->environmentVariables();
    $cronVar = $vars->where('key', 'CRON_SECRET')->first();
    if ($cronVar) {
      $cronVar->value = encrypt('${CRON_SECRET}');
      $cronVar->save();
      echo "CRON_SECRET updated\\n";
    } else {
      echo "CRON_SECRET not found\\n";
    }
    $appUrlVar = $vars->where('key', 'NEXT_PUBLIC_APP_URL')->where('is_buildtime', true)->first();
    if ($appUrlVar) {
      $appUrlVar->value = encrypt('https://actioncash.app');
      $appUrlVar->save();
      echo "NEXT_PUBLIC_APP_URL updated\\n";
    } else {
      echo "NEXT_PUBLIC_APP_URL not found\\n";
    }
  `;

  // Write the script to a temp file and run it
  const cmd = `docker exec coolify php artisan tinker --execute="${script.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`;
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    let output = '';
    stream.on('data', (data) => { output += data.toString(); });
    stream.stderr.on('data', (data) => { output += data.toString(); });
    stream.on('close', () => { console.log(output); conn.end(); });
  });
}).on('error', (err) => console.error('SSH Error:', err.message));
conn.connect({ host: '164.68.126.14', port: 22, username: 'root', password: '@!Isa46936698@' });
