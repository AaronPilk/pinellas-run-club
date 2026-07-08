/**
 * Expo config plugin: fix fmt consteval build errors on newer Xcode/Clang.
 * RN 0.76 ships fmt 9.x whose consteval format-string checks fail under
 * strict Clang (Xcode 16.3+). Injects preprocessor defines into the fmt
 * and RCT-Folly pod targets via the Podfile post_install hook.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PATCH_MARKER = 'FMT_CONSTEVAL=';

const PATCH = `
    # Fix fmt consteval build errors on newer Xcode/Clang (RN 0.76 ships fmt 9.x).
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt' || target.name == 'RCT-Folly'
        target.build_configurations.each do |config|
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_CONSTEVAL='
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_USE_NONTYPE_TEMPLATE_ARGS=0'
        end
      end
    end
`;

module.exports = function withFmtXcodeFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (!contents.includes(PATCH_MARKER)) {
        contents = contents.replace(
          /(post_install do \|installer\|)/,
          `$1\n${PATCH}`
        );
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
};
