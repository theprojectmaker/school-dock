Pod::Spec.new do |s|
  s.name           = 'SchoolLock'
  s.version        = '1.0.0'
  s.summary        = 'School Dock lock-in (Guided Access / Autonomous Single App Mode)'
  s.description    = 'Asks iOS to lock the iPad into this app and reads the managed app configuration a school MDM pushes.'
  s.license        = 'MIT'
  s.author         = 'School Dock'
  s.homepage       = 'https://example.com/school-dock'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  s.source_files = "**/*.{h,m,swift}"
end
