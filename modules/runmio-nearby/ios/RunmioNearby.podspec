require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "package.json")))

Pod::Spec.new do |s|
  s.name = "RunmioNearby"
  s.version = package["version"]
  s.summary = package["description"]
  s.description = "An Expo module backed by Apple Multipeer Connectivity."
  s.license = package["license"]
  s.author = "Runmio"
  s.homepage = "https://runmio.app"
  s.platforms = { :ios => "16.4" }
  s.swift_version = "5.9"
  s.static_framework = true
  s.source = { :git => "" }
  s.source_files = "**/*.{h,m,mm,swift}"

  s.dependency "ExpoModulesCore"
end
