/**
 * Expo config plugin: fix fmt consteval build errors on newer Xcode/Clang.
 * RN 0.76 ships fmt 9.x whose consteval format-string checks fail under
 * strict Clang (Xcode 16.3+). Injects preprocessor defines into the fmt
 * and RCT-Folly pod targets via the Podfile post_install hook.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PATCH_MARKER = 'PRC patch: force consteval off';

const PATCH = `
    # Fix fmt consteval build errors on newer Xcode/Clang (RN 0.76 ships fmt 9.x).
    installer.pods_project.targets.each do |target|
      target.build_phases.each do |phase|
        next unless phase.respond_to?(:shell_script) && phase.shell_script
        broken = '/bin/sh -c "$WITH_ENVIRONMENT $SCRIPT_PHASES_SCRIPT"'
        fixed = '/bin/sh -c ". \\"$WITH_ENVIRONMENT\\" && /bin/bash \\"$SCRIPT_PHASES_SCRIPT\\""'
        if phase.shell_script.include?(broken)
          phase.shell_script = phase.shell_script.sub(broken, fixed)
        end
      end
    end

    fmt_base = File.join(installer.sandbox.root, 'fmt/include/fmt/base.h')
    if File.exist?(fmt_base)
      original = File.read(fmt_base)
      patched = original.gsub(
        '#if !defined(__cpp_lib_is_constant_evaluated)',
        '#if 1 // PRC patch: force consteval off (new Xcode clang rejects fmt consteval)'
      )
      File.write(fmt_base, patched) if patched != original
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
