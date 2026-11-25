import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/routing/app_routes.dart';
import '../../../../core/widgets/care_id_bottom_nav_bar.dart';
import '../../data/insurance_service.dart';
import '../widgets/insurance_assets.dart';

/// Screen 4: OCR Processing - Insurance Card (`20:20415`)
class InsuranceOcrProcessingPage extends StatefulWidget {
  const InsuranceOcrProcessingPage({super.key});

  @override
  State<InsuranceOcrProcessingPage> createState() => _InsuranceOcrProcessingPageState();
}

class _InsuranceOcrProcessingPageState extends State<InsuranceOcrProcessingPage>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _laserAnimation;
  int _progressPercent = 45;
  Timer? _timer;
  String? _jobId;
  bool _isProcessing = false;
  String? _pollErrorMessage;
  bool _hasNoDocument = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _laserAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments;
    if (!_isProcessing) {
      _isProcessing = true;
      if (args is Map<String, dynamic> && args['fileBytes'] is List<int>) {
        _startDirectOcrScan(
          args['fileBytes'] as List<int>,
          args['filename']?.toString() ?? 'insurance_card.png',
        );
      } else if (args is Map<String, dynamic> && args['jobId'] != null) {
        _jobId = args['jobId'].toString();
        _startRealJobPolling(_jobId!);
      } else {
        setState(() {
          _hasNoDocument = true;
          _pollErrorMessage = 'No document selected. Please capture or select an image.';
        });
      }
    }
  }

  void _startDirectOcrScan(List<int> bytes, String filename) async {
    setState(() {
      _progressPercent = 45;
      _pollErrorMessage = null;
      _hasNoDocument = false;
    });

    // Animate progress smoothly while OCR processes on backend
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(milliseconds: 200), (t) {
      if (!mounted) return;
      if (_progressPercent < 90) {
        setState(() => _progressPercent += 3);
      }
    });

    final res = await InsuranceService.instance.scanInsuranceCard(
      fileBytes: bytes,
      filename: filename,
    );
    _timer?.cancel();
    if (!mounted) return;

    if (res.isSuccess && res.data != null && res.data!.isNotEmpty) {
      setState(() => _progressPercent = 100);
      final data = res.data!;
      final Map<String, dynamic> extractedData = {
        'ocrId': data['ocrId'],
        'confidence': data['confidence'],
        'engine': data['engine'] ?? 'PP-OCRv4-Mobile-CPU',
        'isSimulated': data['isSimulated'] ?? false,
      };
      if (data['extractedData'] is Map) {
        extractedData.addAll(Map<String, dynamic>.from(data['extractedData'] as Map));
      }

      Future.delayed(const Duration(milliseconds: 350), () {
        if (mounted) {
          Navigator.of(context).pushReplacementNamed(
            AppRoutes.insuranceExtractionResults,
            arguments: extractedData,
          );
        }
      });
    } else {
      setState(() {
        _pollErrorMessage = res.errorMessage ?? 'Failed to process card with live OCR engine.';
      });
    }
  }

  void _startRealJobPolling(String jobId) async {
    int attempts = 0;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 2), (t) async {
      attempts++;
      final res = await InsuranceService.instance.getOcrJob(jobId);
      if (!mounted) return;

      if (res.isSuccess && res.data is Map) {
        final job = res.data as Map;
        final status = job['status']?.toString().toUpperCase();

        if (status == 'COMPLETED' || status == 'REVIEW_REQUIRED') {
          t.cancel();
          setState(() => _progressPercent = 100);

          final jsonRes = await InsuranceService.instance.getOcrJobJson(jobId);
          final fieldsRes = await InsuranceService.instance.getOcrJobFields(jobId);
          final Map<String, dynamic> extractedData = {
            'ocrId': jobId,
            'confidence': job['overallConfidence'],
            'confidenceLevel': job['confidenceLevel'],
            'engine': job['extractionEngine'] ?? 'PP-OCRv4-Mobile-CPU',
            'isSimulated': job['isSimulated'] ?? false,
          };

          if (jsonRes.isSuccess && jsonRes.data is Map) {
            final jdata = jsonRes.data as Map;
            final mapData = jdata['data'] is Map ? (jdata['data'] as Map) : jdata;
            if (mapData['fields'] is Map) {
              final fieldsMap = mapData['fields'] as Map;
              fieldsMap.forEach((k, v) {
                if (v is Map && v['value'] != null) {
                  extractedData[k.toString()] = v['value'];
                }
              });
            }
          }

          if (fieldsRes.isSuccess) {
            dynamic fData = fieldsRes.data;
            if (fData is Map && fData['data'] is List) fData = fData['data'];
            if (fData is List) {
              for (final item in fData) {
                if (item is Map && item['fieldName'] != null) {
                  extractedData[item['fieldName'].toString()] = item['fieldValue'];
                }
              }
            }
          }

          if (mounted) {
            Navigator.of(context).pushReplacementNamed(
              AppRoutes.insuranceExtractionResults,
              arguments: extractedData,
            );
          }
          return;
        } else if (status == 'FAILED') {
          t.cancel();
          setState(() {
            _pollErrorMessage = job['failureReason']?.toString() ?? 'OCR processing failed on server';
          });
          return;
        } else {
          setState(() {
            _progressPercent = (65 + attempts * 4).clamp(65, 95);
          });
        }
      }

      if (attempts >= 15) {
        t.cancel();
        setState(() {
          _pollErrorMessage = 'OCR processing timed out. Please enter details manually.';
        });
      }
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            // Atmospheric Glows
            Positioned(
              top: -60,
              right: -60,
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF75F2FE).withOpacity(0.18),
                ),
              ),
            ),
            Positioned(
              bottom: 40,
              left: -60,
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF3F1D8B).withOpacity(0.1),
                ),
              ),
            ),

            Column(
              children: [
                _buildTopAppBar(context),
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        if (_hasNoDocument)
                          _buildNoDocumentView()
                        else ...[
                          _buildScanningBentoSection(),
                          const SizedBox(height: 24),
                          _buildStepIndicators(),
                          const SizedBox(height: 32),
                          _buildStatusTextArea(),
                          const SizedBox(height: 32),
                          _buildAsymmetricInfoCards(),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      bottomNavigationBar: const CareIDBottomNavBar(currentIndex: 1),
    );
  }

  Widget _buildTopAppBar(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      color: const Color(0xFFF8F9FF),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              GestureDetector(
                onTap: () {
                  Navigator.of(context).pop();
                },
                behavior: HitTestBehavior.opaque,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: SvgPicture.asset(
                      InsuranceAssets.backArrow,
                      width: 16,
                      height: 16,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'OCR Processing',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF28006D),
                ),
              ),
              const SizedBox(width: 8),
              Image.asset(
                'assets/images/card_id_badge.png',
                height: 20,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const SizedBox(),
              ),
            ],
          ),
          Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.info_outline,
              color: Color(0xFF494552),
              size: 20,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScanningBentoSection() {
    return AspectRatio(
      aspectRatio: 1.58,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.5),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Colors.white.withOpacity(0.6),
            width: 1.5,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1428006D),
              blurRadius: 32,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Blurred Card Mockup
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFE5EEFF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: const Color(0xFFCBC4D4),
                    width: 1.5,
                  ),
                ),
                padding: const EdgeInsets.all(18),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFFCBC4D4).withOpacity(0.4),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: double.infinity,
                                height: 14,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFCBC4D4).withOpacity(0.35),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                width: 120,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFCBC4D4).withOpacity(0.25),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 200,
                          height: 24,
                          decoration: BoxDecoration(
                            color: const Color(0xFFCBC4D4).withOpacity(0.35),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                height: 12,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFCBC4D4).withOpacity(0.25),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Container(
                                height: 12,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFCBC4D4).withOpacity(0.25),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Animated Laser Sweep
            AnimatedBuilder(
              animation: _laserAnimation,
              builder: (context, child) {
                return Align(
                  alignment: Alignment(0, (_laserAnimation.value * 2) - 1),
                  child: Container(
                    height: 3.5,
                    decoration: const BoxDecoration(
                      color: Color(0xFF006971),
                      boxShadow: [
                        BoxShadow(
                          color: Color(0xFF006971),
                          blurRadius: 16,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),

            // Center Shield Progress Circle
            Center(
              child: Container(
                width: 106,
                height: 106,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.92),
                  border: Border.all(
                    color: const Color(0xFFE8DDFF),
                    width: 2,
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x1F000000),
                      blurRadius: 15,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$_progressPercent%',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF28006D),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'ACTIVE',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                        color: const Color(0xFF006971),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepIndicators() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          child: Container(
            height: 6,
            decoration: BoxDecoration(
              color: const Color(0xFF28006D),
              borderRadius: BorderRadius.circular(9999),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Container(
            height: 6,
            decoration: BoxDecoration(
              color: const Color(0xFF28006D),
              borderRadius: BorderRadius.circular(9999),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Container(
            height: 6,
            decoration: BoxDecoration(
              color: const Color(0xFF006971),
              borderRadius: BorderRadius.circular(9999),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Container(
            height: 6,
            decoration: BoxDecoration(
              color: const Color(0xFFD3E4FE),
              borderRadius: BorderRadius.circular(9999),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNoDocumentView() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE8DDFF)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F000000),
            blurRadius: 16,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          const Icon(
            Icons.document_scanner_outlined,
            size: 56,
            color: Color(0xFF28006D),
          ),
          const SizedBox(height: 16),
          Text(
            'No Document Selected',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF28006D),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'No insurance card was selected or captured. Please take a photo of your insurance card or select one from your gallery to process with the live OCR engine.',
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              color: const Color(0xFF494552),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.of(context).pushReplacementNamed(AppRoutes.insuranceCameraCapture);
            },
            icon: const Icon(Icons.camera_alt, color: Colors.white, size: 20),
            label: Text(
              'Capture Insurance Card',
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF28006D),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusTextArea() {
    final isError = _pollErrorMessage != null;
    return Column(
      children: [
        Text(
          isError ? 'Processing Error' : 'Extracting Insurance Information...',
          textAlign: TextAlign.center,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: isError ? const Color(0xFFEF4444) : const Color(0xFF28006D),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _pollErrorMessage ??
              'Our secure vault is processing your data with\nclinical precision. Please wait a moment.',
          textAlign: TextAlign.center,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 15,
            height: 1.45,
            color: isError ? const Color(0xFFB91C1C) : const Color(0xFF494552),
          ),
        ),
        if (isError) ...[
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.of(context).pushReplacementNamed(AppRoutes.insuranceCameraCapture);
            },
            icon: const Icon(Icons.refresh, color: Colors.white, size: 18),
            label: Text(
              'Capture Again',
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF28006D),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildAsymmetricInfoCards() {
    return Row(
      children: [
        // Security Card
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.7),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.white.withOpacity(0.6),
                width: 1,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1428006D),
                  blurRadius: 12,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SvgPicture.asset(
                  InsuranceAssets.securityShield,
                  width: 20,
                  height: 20,
                  errorBuilder: (_, __, ___) => const Icon(
                    Icons.security,
                    color: Color(0xFF28006D),
                    size: 20,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'SECURITY',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.6,
                    color: const Color(0xFF7A7583),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'AES-256\nEncrypted',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0B1C30),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 16),
        // Storage Card
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.7),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFF006971).withOpacity(0.3),
                width: 1,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1428006D),
                  blurRadius: 12,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SvgPicture.asset(
                  InsuranceAssets.cloudSync,
                  width: 20,
                  height: 16,
                  errorBuilder: (_, __, ___) => const Icon(
                    Icons.cloud_sync,
                    color: Color(0xFF006971),
                    size: 20,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'STORAGE',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.6,
                    color: const Color(0xFF7A7583),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Cloud Sync\nActive',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0B1C30),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

