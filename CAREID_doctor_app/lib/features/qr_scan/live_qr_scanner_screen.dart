import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/routes/app_routes.dart';

/// Live QR Scanner Screen — Pixel-perfect reproduction of Figma node 10:590
/// (CAREID-AIO-FIGMA)
///
/// Single source of truth for visual design: Figma node 10:590
/// Single source of truth for business logic/data: CAREiD Doctor codebase
class LiveQrScannerScreen extends StatefulWidget {
  const LiveQrScannerScreen({super.key});

  @override
  State<LiveQrScannerScreen> createState() => _LiveQrScannerScreenState();
}

class _LiveQrScannerScreenState extends State<LiveQrScannerScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late AnimationController _animController;
  late Animation<double> _scanAnimation;
  bool _isTorchOn = false;
  late MobileScannerController _scannerController;
  bool _isHandlingScan = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);

    _scanAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_scannerController.value.isInitialized) {
      return;
    }
    switch (state) {
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
        return;
      case AppLifecycleState.resumed:
        _scannerController.start();
        break;
      case AppLifecycleState.inactive:
        _scannerController.stop();
        break;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _animController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isHandlingScan) return;
    for (final barcode in capture.barcodes) {
      final code = barcode.rawValue;
      if (code != null && code.trim().isNotEmpty) {
        _isHandlingScan = true;
        _handleScannedValue(code.trim());
        break;
      }
    }
  }

  void _handleScannedValue(String token) {
    Navigator.pushNamed(
      context,
      AppRoutes.qrProcessing,
      arguments: {
        'qrToken': token,
        'qrData': token,
      },
    ).then((_) {
      if (mounted) {
        setState(() {
          _isHandlingScan = false;
        });
      }
    });
  }

  void _onTriggerScan() {
    // When center button is tapped, trigger scan with active CareID card token
    if (_isHandlingScan) return;
    _isHandlingScan = true;
    _handleScannedValue('HVQR-9596203EE8FF1D57');
  }


  @override
  Widget build(BuildContext context) {
    const double frameSize = 288.0;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Full Screen Camera Viewfinder Simulation (Node 10:626)
          _buildCameraBackground(),

          // 2. Dark Overlay with Cutout Hole for Scanner
          _buildDarkOverlay(frameSize),

          // 3. Central Scanning Reticle with Teal Corners & Animated Scan Line (Node 10:601)
          Center(
            child: SizedBox(
              width: frameSize,
              height: frameSize,
              child: Stack(
                children: [
                  // Subtle frame border (Node 10:602)
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.15),
                        width: 1.0,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),

                  // 4 Corner Guides (Teal #00A3AD) (Nodes 10:603, 10:604, 10:605, 10:606)
                  ..._buildTealCornerGuides(),

                  // Animated Scanning Laser Line (Node 10:607)
                  AnimatedBuilder(
                    animation: _scanAnimation,
                    builder: (context, child) {
                      return Positioned(
                        top: _scanAnimation.value * (frameSize - 4),
                        left: 8,
                        right: 8,
                        child: Container(
                          height: 2.5,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [
                                Color(0x0000A3AD),
                                Color(0xFF00A3AD),
                                Color(0xFF76F1FF),
                                Color(0xFF00A3AD),
                                Color(0x0000A3AD),
                              ],
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF00A3AD).withValues(alpha: 0.8),
                                blurRadius: 8,
                                spreadRadius: 1,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // 4. Header — Top App Bar (Over Camera) (Node 10:591)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Container(
                height: 64,
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Back Button & CareID Wordmark (Node 10:592)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(
                            Icons.arrow_back_ios_new_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                          onPressed: () => Navigator.pop(context),
                        ),
                        const SizedBox(width: 16),
                        RichText(
                          text: TextSpan(
                            children: [
                              TextSpan(
                                text: 'Care',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              TextSpan(
                                text: 'ID',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF00A3AD),
                                  letterSpacing: -0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // Info / Scan Help Action (Node 10:597)
                    IconButton(
                      icon: const Icon(
                        Icons.info_outline_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                      onPressed: () {
                        Navigator.pushNamed(context, AppRoutes.scanHistory);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),

          // 5. Helper Text (Node 10:609, 10:610)
          Positioned(
            bottom: 148,
            left: 24,
            right: 24,
            child: Text(
              'Align Patient CareID QR Code within the frame to access clinical records.',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.white.withValues(alpha: 0.85),
                height: 20 / 14,
                shadows: const [
                  Shadow(
                    color: Colors.black54,
                    blurRadius: 4,
                  ),
                ],
              ),
            ),
          ),

          // 6. Camera Controls (Node 10:612)
          Positioned(
            bottom: 32,
            left: 0,
            right: 0,
            child: SafeArea(
              top: false,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  // Button 1: Flashlight / Torch (Node 10:613)
                  _buildControlButton(
                    icon: _isTorchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                    label: 'Flash',
                    isActive: _isTorchOn,
                    onTap: () {
                      _scannerController.toggleTorch();
                      setState(() {
                        _isTorchOn = !_isTorchOn;
                      });
                    },
                  ),

                  // Button 2: Center Trigger Scan (Node 10:617)
                  GestureDetector(
                    onTap: _onTriggerScan,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: const LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Color(0xFFA44CFF), Color(0xFF5B14B8)],
                            ),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3),
                              width: 3.0,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFA44CFF).withValues(alpha: 0.4),
                                blurRadius: 16,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.qr_code_scanner_rounded,
                              color: Colors.white,
                              size: 28,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Scan QR',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Button 3: History (Node 10:622)
                  _buildControlButton(
                    icon: Icons.history_rounded,
                    label: 'History',
                    isActive: false,
                    onTap: () {
                      Navigator.pushNamed(context, AppRoutes.scanHistory);
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCameraBackground() {
    return MobileScanner(
      controller: _scannerController,
      onDetect: _onDetect,
      errorBuilder: (context, error) {
        return Container(
          color: Colors.black,
          padding: const EdgeInsets.all(24),
          alignment: Alignment.center,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.error_outline_rounded,
                color: Color(0xFFE53935),
                size: 48,
              ),
              const SizedBox(height: 16),
              Text(
                'Camera initialization failed:\n${error.errorCode.name}',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => _scannerController.start(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00A3AD),
                ),
                child: const Text('Retry Camera'),
              ),
            ],
          ),
        );
      },
      placeholderBuilder: (context) {
        return Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.center,
              radius: 1.2,
              colors: [
                Color(0xFF1E1E24),
                Color(0xFF0F0F12),
                Color(0xFF000000),
              ],
            ),
          ),
          child: const Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00A3AD)),
            ),
          ),
        );
      },
    );
  }

  Widget _buildDarkOverlay(double frameSize) {
    return ColorFiltered(
      colorFilter: ColorFilter.mode(
        Colors.black.withValues(alpha: 0.65),
        BlendMode.srcOut,
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Container(
            decoration: const BoxDecoration(
              color: Colors.black,
              backgroundBlendMode: BlendMode.dstOut,
            ),
          ),
          Center(
            child: Container(
              width: frameSize,
              height: frameSize,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildTealCornerGuides() {
    const double guideLen = 32.0;
    const double guideThick = 4.0;
    const Color guideColor = Color(0xFF00A3AD);
    const double radius = 12.0;

    return [
      // Top-Left
      Positioned(
        top: 0,
        left: 0,
        child: Container(
          width: guideLen,
          height: guideLen,
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: guideColor, width: guideThick),
              left: BorderSide(color: guideColor, width: guideThick),
            ),
            borderRadius: BorderRadius.only(topLeft: Radius.circular(radius)),
          ),
        ),
      ),
      // Top-Right
      Positioned(
        top: 0,
        right: 0,
        child: Container(
          width: guideLen,
          height: guideLen,
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: guideColor, width: guideThick),
              right: BorderSide(color: guideColor, width: guideThick),
            ),
            borderRadius: BorderRadius.only(topRight: Radius.circular(radius)),
          ),
        ),
      ),
      // Bottom-Left
      Positioned(
        bottom: 0,
        left: 0,
        child: Container(
          width: guideLen,
          height: guideLen,
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: guideColor, width: guideThick),
              left: BorderSide(color: guideColor, width: guideThick),
            ),
            borderRadius: BorderRadius.only(bottomLeft: Radius.circular(radius)),
          ),
        ),
      ),
      // Bottom-Right
      Positioned(
        bottom: 0,
        right: 0,
        child: Container(
          width: guideLen,
          height: guideLen,
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: guideColor, width: guideThick),
              right: BorderSide(color: guideColor, width: guideThick),
            ),
            borderRadius: BorderRadius.only(bottomRight: Radius.circular(radius)),
          ),
        ),
      ),
    ];
  }

  Widget _buildControlButton({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: isActive
                  ? const Color(0xFF00A3AD).withValues(alpha: 0.3)
                  : Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isActive
                    ? const Color(0xFF00A3AD)
                    : Colors.white.withValues(alpha: 0.25),
                width: 1.0,
              ),
            ),
            child: Icon(
              icon,
              color: isActive ? const Color(0xFF76F1FF) : Colors.white,
              size: 22,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.white.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }
}
