import { execSync } from 'child_process';
import * as os from 'os';

export function ensureGitInstalled() {
  try {
    // Try to run 'git --version' to check if git is available
    execSync('git --version', { stdio: 'ignore' });
    console.log('✅ Git is already installed.');
  } catch {
    console.warn('⚠️ Git is not installed. Attempting to install...');

    const platform = os.platform();

    try {
      if (platform === 'linux') {
        // For Linux (Debian/Ubuntu), install git using apt-get
        execSync('apt-get update && apt-get install -y git', { stdio: 'inherit' });
        console.log('✅ Git was successfully installed.');
      } else {
        // Unsupported OS for automatic installation
        throw new Error(`Automatic git installation is not supported on platform: ${platform}`);
      }
    } catch (err) {
      console.error(`❌ Failed to install git: ${err.message}`);
      throw err;
    }
  }
}
