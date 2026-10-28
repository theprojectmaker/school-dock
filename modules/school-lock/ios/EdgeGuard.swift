import UIKit

// School Dock draws its own home bar. Without this, a swipe up from the bottom
// edge goes to iPadOS first and throws the student out of the app (then back
// to the lock screen). Deferring the bottom edge makes iPadOS let the first
// swipe through to School Dock and only act on a second one, like games do.
// Every view controller gets the same answer, so screens React Native or Expo
// present later (sheets, the document camera) behave the same.
enum EdgeGuard {
  private static var installed = false

  static func install() {
    guard !installed else { return }
    installed = true
    let cls: AnyClass = UIViewController.self
    if let original = class_getInstanceMethod(cls, #selector(getter: UIViewController.preferredScreenEdgesDeferringSystemGestures)),
       let replacement = class_getInstanceMethod(cls, #selector(UIViewController.schoolDock_deferredEdges)) {
      method_exchangeImplementations(original, replacement)
    }
    DispatchQueue.main.async { refresh() }
  }

  /** Asks every window's view controllers to re-read the deferred edges. */
  static func refresh() {
    for scene in UIApplication.shared.connectedScenes {
      guard let ws = scene as? UIWindowScene else { continue }
      for window in ws.windows {
        var vc = window.rootViewController
        while let v = vc {
          v.setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
          v.children.forEach { $0.setNeedsUpdateOfScreenEdgesDeferringSystemGestures() }
          vc = v.presentedViewController
        }
      }
    }
  }
}

extension UIViewController {
  @objc func schoolDock_deferredEdges() -> UIRectEdge { .bottom }
}
