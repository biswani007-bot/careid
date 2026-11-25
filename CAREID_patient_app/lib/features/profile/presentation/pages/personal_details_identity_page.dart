import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/routing/app_routes.dart';
import '../../../../core/widgets/care_id_bottom_nav_bar.dart';
import '../../data/demo_patient_profile_store.dart';

/// Screen 80: Personal Details & Identity
/// Node ID: 20:24653
class PersonalDetailsIdentityPage extends StatefulWidget {
  const PersonalDetailsIdentityPage({super.key});

  @override
  State<PersonalDetailsIdentityPage> createState() => _PersonalDetailsIdentityPageState();
}

class _PersonalDetailsIdentityPageState extends State<PersonalDetailsIdentityPage> {
  late final TextEditingController _nameController;
  late final TextEditingController _dobController;
  late final TextEditingController _genderController;
  late final TextEditingController _bloodGroupController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late final TextEditingController _addressController;
  late String _currentAvatar;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _populateFromStore();
    DemoPatientProfileStore.instance.addListener(_onStoreChanged);
    _nameController.addListener(() => setState(() {}));
  }

  void _populateFromStore() {
    final profile = DemoPatientProfileStore.instance.currentProfile;
    _nameController = TextEditingController(text: profile.fullName);
    _dobController = TextEditingController(text: profile.dateOfBirth);
    _genderController = TextEditingController(text: profile.gender);
    _bloodGroupController = TextEditingController(text: profile.bloodGroup);
    _phoneController = TextEditingController(text: profile.mobile);
    _emailController = TextEditingController(text: profile.email);
    _addressController = TextEditingController(text: profile.address);
    _currentAvatar = profile.avatarAsset;
  }

  void _onStoreChanged() {
    if (!mounted || _isSaving) return;
    final profile = DemoPatientProfileStore.instance.currentProfile;
    if (_nameController.text != profile.fullName) _nameController.text = profile.fullName;
    if (_dobController.text != profile.dateOfBirth) _dobController.text = profile.dateOfBirth;
    if (_genderController.text != profile.gender) _genderController.text = profile.gender;
    if (_bloodGroupController.text != profile.bloodGroup) _bloodGroupController.text = profile.bloodGroup;
    if (_phoneController.text != profile.mobile) _phoneController.text = profile.mobile;
    if (_emailController.text != profile.email) _emailController.text = profile.email;
    if (_addressController.text != profile.address) _addressController.text = profile.address;
    if (_currentAvatar != profile.avatarAsset) {
      setState(() {
        _currentAvatar = profile.avatarAsset;
      });
    }
  }

  @override
  void dispose() {
    DemoPatientProfileStore.instance.removeListener(_onStoreChanged);
    _nameController.dispose();
    _dobController.dispose();
    _genderController.dispose();
    _bloodGroupController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _discardChanges() {
    final saved = DemoPatientProfileStore.instance.currentProfile;
    setState(() {
      _nameController.text = saved.fullName;
      _dobController.text = saved.dateOfBirth;
      _genderController.text = saved.gender;
      _bloodGroupController.text = saved.bloodGroup;
      _phoneController.text = saved.mobile;
      _emailController.text = saved.email;
      _addressController.text = saved.address;
      _currentAvatar = saved.avatarAsset;
    });
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Changes discarded. Restored saved details.',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Colors.white,
          ),
        ),
        backgroundColor: const Color(0xFF28006D),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _saveDetails() async {
    if (_isSaving) return;

    final name = _nameController.text.trim();
    final dob = _dobController.text.trim();
    final gender = _genderController.text.trim();
    final bloodGroup = _bloodGroupController.text.trim();
    final mobile = _phoneController.text.trim();
    final email = _emailController.text.trim();
    final address = _addressController.text.trim();

    String? error;
    if (name.isEmpty) {
      error = 'Full Name is required.';
    } else if (name.length < 2) {
      error = 'Full Name must be at least 2 characters.';
    } else if (dob.isEmpty) {
      error = 'Date of Birth is required.';
    } else if (gender.isEmpty) {
      error = 'Gender is required.';
    } else if (bloodGroup.isEmpty) {
      error = 'Blood Group is required.';
    } else if (mobile.isEmpty) {
      error = 'Mobile number is required.';
    } else if (mobile.replaceAll(RegExp(r'[^0-9]'), '').length < 7) {
      error = 'Please enter a valid mobile number (min 7 digits).';
    } else if (email.isEmpty) {
      error = 'Email address is required.';
    } else if (!email.contains('@') || !email.contains('.')) {
      error = 'Please enter a valid email address.';
    } else if (address.isEmpty) {
      error = 'Address is required.';
    }

    if (error != null) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  error,
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFFBA1A1A),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    }

    setState(() {
      _isSaving = true;
    });

    final current = DemoPatientProfileStore.instance.currentProfile;
    final updated = current.copyWith(
      fullName: name,
      dateOfBirth: dob,
      gender: gender,
      bloodGroup: bloodGroup,
      mobile: mobile,
      email: email,
      address: address,
      avatarAsset: _currentAvatar,
    );

    final success = await DemoPatientProfileStore.instance.saveCompleteProfile(updated);

    if (!mounted) return;

    setState(() {
      _isSaving = false;
    });

    if (success) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Personal details updated successfully!',
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF006D76),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
    } else {
      final err = DemoPatientProfileStore.instance.lastError ?? 'Failed to update profile on backend';
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  err,
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFFBA1A1A),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Future<void> _selectDateOfBirth() async {
    DateTime initialDate = DateTime(1992, 5, 12);
    final parts = _dobController.text.split('/');
    if (parts.length == 3) {
      final d = int.tryParse(parts[0]);
      final m = int.tryParse(parts[1]);
      final y = int.tryParse(parts[2]);
      if (d != null && m != null && y != null && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        initialDate = DateTime(y, m, d);
      }
    }
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF28006D),
              onPrimary: Colors.white,
              onSurface: Color(0xFF0B1C30),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      final day = picked.day.toString().padLeft(2, '0');
      final month = picked.month.toString().padLeft(2, '0');
      final year = picked.year.toString();
      setState(() {
        _dobController.text = '$day/$month/$year';
      });
    }
  }

  void _selectGender() {
    final options = ['Female', 'Male', 'Non-Binary', 'Other', 'Prefer not to say'];
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFCBC4D4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Select Gender',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF28006D),
                ),
              ),
            ),
            ...options.map((opt) => ListTile(
              title: Text(
                opt,
                style: GoogleFonts.plusJakartaSans(
                  fontWeight: _genderController.text == opt ? FontWeight.bold : FontWeight.w500,
                  color: _genderController.text == opt ? const Color(0xFF28006D) : const Color(0xFF0B1C30),
                ),
              ),
              trailing: _genderController.text == opt
                  ? const Icon(Icons.check_circle_rounded, color: Color(0xFF006971))
                  : null,
              onTap: () {
                setState(() {
                  _genderController.text = opt;
                });
                Navigator.pop(ctx);
              },
            )),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  void _selectBloodGroup() {
    final options = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBC4D4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Select Blood Group',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF28006D),
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                alignment: WrapAlignment.center,
                children: options.map((opt) {
                  final isSelected = _bloodGroupController.text == opt;
                  return ChoiceChip(
                    label: Text(
                      opt,
                      style: GoogleFonts.plusJakartaSans(
                        fontWeight: FontWeight.w700,
                        color: isSelected ? Colors.white : const Color(0xFF28006D),
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: const Color(0xFF28006D),
                    backgroundColor: const Color(0xFFEFF4FF),
                    onSelected: (_) {
                      setState(() {
                        _bloodGroupController.text = opt;
                      });
                      Navigator.pop(ctx);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  void _selectProfilePhoto() {
    final avatarOptions = [
      'assets/images/bfd7567e81ca7834f0c16f9b7bd9f27a17ef5ae1.png',
      'assets/images/patient_avatar.png',
      'assets/images/user_avatar_sarah.png',
      'assets/images/doctor_sarah_jenkins.png',
    ];
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBC4D4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Choose Profile Photo',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF28006D),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: avatarOptions.map((asset) {
                  final isSelected = _currentAvatar == asset;
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _currentAvatar = asset;
                      });
                      Navigator.pop(ctx);
                    },
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected ? const Color(0xFF28006D) : Colors.transparent,
                          width: 3,
                        ),
                      ),
                      child: CircleAvatar(
                        radius: 28,
                        backgroundImage: AssetImage(asset),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FF),
      body: Stack(
        children: [
          // Background Gradient
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFFF8F9FF),
                    Color(0xFFFFFFFF),
                  ],
                ),
              ),
            ),
          ),

          // Main Scrollable Content
          SafeArea(
            bottom: false,
            child: ListView(
              padding: const EdgeInsets.only(
                top: 72,
                left: 16,
                right: 16,
                bottom: 110,
              ),
              children: [
                // Profile Avatar & Patient ID
                _buildProfileAvatarSection(),
                const SizedBox(height: 24),

                // Form Fields Section
                _buildFormSection(),
                const SizedBox(height: 24),

                // Secure Health Vault Info Card
                _buildSecurityVaultCard(),
                const SizedBox(height: 24),
              ],
            ),
          ),

          // Top App Bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: _buildTopAppBar(context),
          ),

          // Bottom Navigation Bar
          const Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: CareIDBottomNavBar(currentIndex: 3),
          ),
        ],
      ),
    );
  }

  Widget _buildTopAppBar(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFEFF4FF),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 1,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Container(
          height: 64,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Back Button
              InkWell(
                onTap: () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  } else {
                    Navigator.of(context).pushReplacementNamed(AppRoutes.profileSettingsHub);
                  }
                },
                borderRadius: BorderRadius.circular(9999),
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFFCBC4D4).withOpacity(0.3),
                    ),
                  ),
                  child: const Icon(
                    Icons.arrow_back_ios_new,
                    size: 16,
                    color: Color(0xFF28006D),
                  ),
                ),
              ),

              // Title + Badge
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Personal Details',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
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

              const SizedBox(width: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileAvatarSection() {
    final profile = DemoPatientProfileStore.instance.currentProfile;
    final displayName = _nameController.text.trim().isNotEmpty
        ? _nameController.text.trim()
        : profile.fullName;

    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.bottomRight,
          children: [
            Container(
              width: 96,
              height: 96,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white,
                  width: 4,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: ClipOval(
                child: Image.asset(
                  _currentAvatar,
                  fit: BoxFit.cover,
                  errorBuilder: (ctx, err, stack) => Image.asset(
                    'assets/images/patient_avatar.png',
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, err, stack) => Container(
                      color: const Color(0xFFEFF4FF),
                      child: const Icon(
                        Icons.person,
                        size: 48,
                        color: Color(0xFF28006D),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 0,
              right: 0,
              child: InkWell(
                onTap: _selectProfilePhoto,
                borderRadius: BorderRadius.circular(9999),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: const Color(0xFF28006D),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.15),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.camera_alt_outlined,
                    size: 14,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          displayName,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 24,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF0B1C30),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'Patient ID: ${profile.patientId}',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF494552),
            letterSpacing: 0.28,
          ),
        ),
      ],
    );
  }

  Widget _buildFormSection() {
    return Column(
      children: [
        // Full Name
        _buildInputField(
          label: 'Full Name',
          icon: Icons.person_outline_rounded,
          controller: _nameController,
          showEditIcon: true,
        ),
        const SizedBox(height: 16),

        // Date of Birth & Gender
        Row(
          children: [
            Expanded(
              child: _buildInputField(
                label: 'Date of Birth',
                icon: Icons.calendar_today_outlined,
                controller: _dobController,
                showEditIcon: false,
                onTap: _selectDateOfBirth,
                keyboardType: TextInputType.datetime,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: _buildInputField(
                label: 'Gender',
                icon: Icons.transgender_rounded,
                controller: _genderController,
                showDropdownIcon: true,
                onTap: _selectGender,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Blood Group & Mobile
        Row(
          children: [
            Expanded(
              child: _buildInputField(
                label: 'Blood Group',
                icon: Icons.bloodtype_outlined,
                controller: _bloodGroupController,
                showDropdownIcon: true,
                onTap: _selectBloodGroup,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: _buildInputField(
                label: 'Mobile',
                icon: Icons.phone_outlined,
                controller: _phoneController,
                showEditIcon: false,
                keyboardType: TextInputType.phone,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Email
        _buildInputField(
          label: 'Email',
          icon: Icons.mail_outline_rounded,
          controller: _emailController,
          showEditIcon: true,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 16),

        // Address
        _buildInputField(
          label: 'Address',
          icon: Icons.location_on_outlined,
          controller: _addressController,
          showEditIcon: true,
          isMultiline: true,
        ),
        const SizedBox(height: 24),

        // Action Buttons Row
        Row(
          children: [
            // Discard Changes Button
            Expanded(
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: Color(0xFF28006D)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(9999),
                  ),
                ),
                onPressed: _discardChanges,
                child: Text(
                  'Discard Changes',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF28006D),
                    letterSpacing: 0.28,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),

            // Save Details Button
            Expanded(
              child: InkWell(
                onTap: _isSaving ? null : _saveDetails,
                borderRadius: BorderRadius.circular(9999),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0xFFA44CFF),
                        Color(0xFF5B14B8),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(9999),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF5B14B8).withOpacity(0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Center(
                    child: _isSaving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : Text(
                            'Save Details',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                              letterSpacing: 0.28,
                            ),
                          ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildInputField({
    required String label,
    required IconData icon,
    required TextEditingController controller,
    bool showEditIcon = false,
    bool showDropdownIcon = false,
    bool isMultiline = false,
    VoidCallback? onTap,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF28006D),
              letterSpacing: 0.28,
            ),
          ),
        ),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFCBC4D4),
            ),
          ),
          child: Row(
            crossAxisAlignment:
                isMultiline ? CrossAxisAlignment.start : CrossAxisAlignment.center,
            children: [
              Padding(
                padding: EdgeInsets.only(top: isMultiline ? 10 : 0),
                child: GestureDetector(
                  onTap: onTap,
                  child: Icon(
                    icon,
                    size: 20,
                    color: const Color(0xFF494552),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: controller,
                  maxLines: isMultiline ? 2 : 1,
                  keyboardType: keyboardType,
                  onTap: onTap,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    color: const Color(0xFF0B1C30),
                  ),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
              if (showEditIcon)
                const Icon(
                  Icons.edit_outlined,
                  size: 18,
                  color: Color(0xFF494552),
                ),
              if (showDropdownIcon)
                GestureDetector(
                  onTap: onTap,
                  behavior: HitTestBehavior.opaque,
                  child: const Padding(
                    padding: EdgeInsets.all(4.0),
                    child: Icon(
                      Icons.keyboard_arrow_down_rounded,
                      size: 22,
                      color: Color(0xFF494552),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSecurityVaultCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF75F2FE).withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF006971).withOpacity(0.2),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.lock_outline_rounded,
            size: 20,
            color: Color(0xFF006971),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Secure Health Vault',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF006971),
                    letterSpacing: 0.28,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Your personal details are encrypted and stored securely. Only authorized healthcare providers can access this information with your consent.',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    height: 1.4,
                    color: const Color(0xFF494552),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

