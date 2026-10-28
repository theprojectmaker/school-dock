import ExpoModulesCore
import UIKit

// Locking a student into School Dock.
//  - lock(true) asks iOS for Autonomous Single App Mode. iOS only says yes on a
//    supervised iPad whose MDM lists this app's bundle id as allowed to do so
//    (see README). Everywhere else the answer is false and the app tells the
//    teacher to use Guided Access (triple-click) instead.
//  - status() / onLockChange report whether ANY single-app lock is on: ASAM,
//    Guided Access, or the MDM's own Single App Mode all show up the same way.
//  - managedConfig() returns the dictionary an MDM pushes under
//    com.apple.configuration.managed (school name, admin PIN, apps, lock).
public final class SchoolLockModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("SchoolLock")
    Events("onLockChange")

    Function("status") { () -> Bool in
      return UIAccessibility.isGuidedAccessEnabled
    }

    AsyncFunction("lock") { (on: Bool, promise: Promise) in
      UIAccessibility.requestGuidedAccessSession(enabled: on) { ok in
        promise.resolve(ok)
      }
    }.runOnQueue(.main)

    Function("managedConfig") { () -> [String: Any] in
      return UserDefaults.standard.dictionary(forKey: "com.apple.configuration.managed") ?? [:]
    }

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: UIAccessibility.guidedAccessStatusDidChangeNotification, object: nil, queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onLockChange", ["locked": UIAccessibility.isGuidedAccessEnabled])
      }
    }

    OnStopObserving {
      if let o = self.observer { NotificationCenter.default.removeObserver(o) }
      self.observer = nil
    }
  }
}
