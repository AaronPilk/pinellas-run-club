/**
 * Expo config plugin: build fixes for new Xcode + project paths containing spaces.
 *
 * 1. fmt 11 consteval: new Xcode clang rejects fmt's consteval format-string
 *    checks and fmt 11 has no preprocessor override, so patch fmt/base.h.
 * 2. RN codegen "Generate Specs" phase: unquoted $WITH_ENVIRONMENT/$SCRIPT_PHASES_SCRIPT.
 * 3. expo-constants "Generate app.config" phase: unquoted script path + unquoted
 *    basename in the helper script.
 * 4. App target "Bundle React Native code and images": react-native-xcode.sh
 *    executed via unquoted backticks.
 *
 * All applied via the Podfile post_install hook so they survive pod installs.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PATCH_MARKER = 'PRC build fixes';

const PATCH = `
    # --- PRC build fixes (new Xcode + spaces in project path) ---
    space_fixes = [
      ['/bin/sh -c "$WITH_ENVIRONMENT $SCRIPT_PHASES_SCRIPT"',
       '/bin/sh -c ". \\"$WITH_ENVIRONMENT\\" && /bin/bash \\"$SCRIPT_PHASES_SCRIPT\\""'],
      ['bash -l -c "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"',
       'bash -l -c "\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\""'],
    ]
    installer.pods_project.targets.each do |target|
      target.build_phases.each do |phase|
        next unless phase.respond_to?(:shell_script) && phase.shell_script
        space_fixes.each do |broken, fixed|
          if phase.shell_script.include?(broken)
            phase.shell_script = phase.shell_script.sub(broken, fixed)
          end
        end
      end
    end

    exconstants_script = File.expand_path('../node_modules/expo-constants/scripts/get-app-config-ios.sh', installer.sandbox.root.to_s + '/..')
    if File.exist?(exconstants_script)
      sc = File.read(exconstants_script)
      fixed_sc = sc.gsub('basename $PROJECT_DIR', 'basename "$PROJECT_DIR"')
      File.write(exconstants_script, fixed_sc) if fixed_sc != sc
    end

    installer.aggregate_targets.map(&:user_project).compact.uniq.each do |project|
      project.targets.each do |target|
        target.build_phases.each do |phase|
          next unless phase.respond_to?(:shell_script) && phase.shell_script
          broken_bt = %(\`"$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'"\`)
          fixed_bt = %(RN_XCODE_SH="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'")"\\n/bin/bash "$RN_XCODE_SH")
          if phase.shell_script.include?(broken_bt)
            phase.shell_script = phase.shell_script.sub(broken_bt, fixed_bt)
          end
        end
      end
      project.save
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
    # --- end PRC build fixes ---
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
