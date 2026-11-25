import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/routing/app_routes.dart';
import '../../../../core/widgets/care_id_bottom_nav_bar.dart';
import '../../../../core/widgets/care_id_notification_button.dart';
import 'package:care_id_patient_app/features/family/data/family_service.dart';
import '../../../../core/state/app_data_sync_manager.dart';

/// Page 39: Family Member List (Figma node 20:21825)
/// Exact implementation matching Figma node 20:21825
class FamilyMemberListPage extends StatefulWidget {
  const FamilyMemberListPage({super.key});

  @override
  State<FamilyMemberListPage> createState() => _FamilyMemberListPageState();
}

class _FamilyMemberListPageState extends State<FamilyMemberListPage> {
  int _selectedFilter = 0; // 0: All, 1: Parents, 2: Children, 3: Spouse, 4: Siblings
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<String> _filters = ['All', 'Parents', 'Children', 'Spouse', 'Siblings'];

  final List<Map<String, dynamic>> _members = [];

  @override
  void initState() {
    super.initState();
    _syncFamilyMembers();
    AppDataSyncManager.instance.familyTick.addListener(_onFamilyTick);
  }

  void _onFamilyTick() {
    if (mounted) {
      _syncFamilyMembers();
    }
  }

  @override
  void dispose() {
    AppDataSyncManager.instance.familyTick.removeListener(_onFamilyTick);
    _searchController.dispose();
    super.dispose();
  }

  void _syncFamilyMembers() async {
    try {
      final res = await FamilyService.instance.getMembers();
      final List<Map<String, dynamic>> loaded = [];
      if (res.isSuccess && res.data != null) {
        for (final member in res.data!) {
          final name = member['fullName']?.toString() ?? member['name']?.toString() ?? 'Family Member';
          final relation = member['relationship']?.toString() ?? 'Relative';
          final relLower = relation.toLowerCase();
          String category = 'Spouse';
          if (relLower.contains('father') || relLower.contains('mother') || relLower.contains('parent')) {
            category = 'Parents';
          } else if (relLower.contains('son') || relLower.contains('daughter') || relLower.contains('child')) {
            category = 'Children';
          } else if (relLower.contains('sibling') || relLower.contains('brother') || relLower.contains('sister')) {
            category = 'Siblings';
          }

          final bool isGuardian = member['isGuardian'] == true;
          final bool isDependent = member['isDependent'] == true;
          final String consent = isGuardian ? 'Full Access' : (isDependent ? 'Parental Proxy' : 'View Only');

          loaded.add({
            'id': member['id']?.toString(),
            'name': name,
            'relation': relation,
            'category': category,
            'verified': member['status'] == 'ACTIVE',
            'healthCardStatus': member['status'] == 'ACTIVE' ? 'Active' : 'Pending',
            'healthCardColor': member['status'] == 'ACTIVE' ? const Color(0xFF006971) : const Color(0xFF7A7583),
            'insurance': 'Verified Coverage',
            'consentStatus': consent,
            'consentColor': const Color(0xFF006971),
            'avatar': isDependent ? 'assets/images/patient_avatar.png' : 'assets/images/doctor_male_avatar.png',
            'isPending': member['status'] != 'ACTIVE',
          });
        }
      }

      // Also load pending invitations
      final invRes = await FamilyService.instance.getInvitations();
      if (invRes.isSuccess && invRes.data != null) {
        for (final inv in invRes.data!) {
          if (inv['status']?.toString().toUpperCase() == 'PENDING') {
            final name = inv['inviteeName']?.toString() ?? inv['inviteePhone']?.toString() ?? 'Invited Member';
            final relation = inv['relationship']?.toString() ?? 'Family';
            final relLower = relation.toLowerCase();
            String category = 'Spouse';
            if (relLower.contains('parent') || relLower.contains('father') || relLower.contains('mother')) {
              category = 'Parents';
            } else if (relLower.contains('child') || relLower.contains('son') || relLower.contains('daughter')) {
              category = 'Children';
            } else if (relLower.contains('sibling')) {
              category = 'Siblings';
            }

            loaded.add({
              'invitationId': inv['id']?.toString(),
              'phone': inv['inviteePhone']?.toString(),
              'name': name,
              'relation': '$relation • Invited',
              'category': category,
              'verified': false,
              'healthCardStatus': 'Pending Invite',
              'healthCardColor': const Color(0xFF7A7583),
              'insurance': 'Awaiting Acceptance',
              'consentStatus': 'Invite Sent',
              'consentColor': const Color(0xFFBA1A1A),
              'avatar': 'assets/images/user_avatar_sarah.png',
              'isPending': true,
            });
          }
        }
      }

      if (mounted) {
        setState(() {
          _members.clear();
          _members.addAll(loaded);
        });
      }
    } catch (_) {}
  }


  List<Map<String, dynamic>> get _filteredMembers {
    return _members.where((m) {
      if (_selectedFilter != 0 && m['category'] != _filters[_selectedFilter]) {
        return false;
      }
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final name = (m['name'] as String).toLowerCase();
        final rel = (m['relation'] as String).toLowerCase();
        return name.contains(q) || rel.contains(q);
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredMembers;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FF),
      appBar: _buildTopAppBar(context),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Bar
            _buildSearchBar(),

            const SizedBox(height: 16),

            // Horizontal Filter Chips
            _buildHorizontalFilterChips(),

            const SizedBox(height: 24),

            // Member Cards
            if (list.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 40),
                child: Center(
                  child: Column(
                    children: [
                      const Icon(Icons.people_outline_rounded, size: 40, color: Color(0xFF7A7583)),
                      const SizedBox(height: 12),
                      Text(
                        'No family members found',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF0B1C30),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Tap + to invite family members or link dependents.',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          color: const Color(0xFF7A7583),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: list.length,
                separatorBuilder: (_, __) => const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  return _buildMemberCard(context, list[index]);
                },
              ),

            const SizedBox(height: 80),
          ],
        ),
      ),
      bottomNavigationBar: const CareIDBottomNavBar(currentIndex: 2),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF006971),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 4,
        onPressed: () {
          Navigator.of(context).pushNamed(AppRoutes.addFamilyMemberForm);
        },
        child: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white, size: 24),
      ),
    );
  }

  PreferredSizeWidget _buildTopAppBar(BuildContext context) {
    return PreferredSize(
      preferredSize: const Size.fromHeight(64),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFF8F9FF).withValues(alpha: 0.8),
          border: Border(
            bottom: BorderSide(
              color: Colors.black.withValues(alpha: 0.05),
              width: 1,
            ),
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                InkWell(
                  onTap: () => Navigator.of(context).pop(),
                  borderRadius: BorderRadius.circular(9999),
                  child: const Padding(
                    padding: EdgeInsets.all(8),
                    child: Icon(
                      Icons.arrow_back_ios_new,
                      size: 18,
                      color: Color(0xFF28006D),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    'Family Management',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF28006D),
                      letterSpacing: -0.3,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Image.asset(
                  'assets/images/card_id_badge.png',
                  height: 20,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const SizedBox(),
                ),
                const Spacer(),
                const CareIDNotificationButton(),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => Navigator.of(context).pushNamed(AppRoutes.smartHealthCard),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFF3F1D8B), width: 2),
                    ),
                    child: const CircleAvatar(
                      backgroundImage: AssetImage('assets/images/patient_avatar.png'),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFCBC4D4)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (val) => setState(() => _searchQuery = val.trim()),
        style: GoogleFonts.plusJakartaSans(fontSize: 15, color: const Color(0xFF0B1C30)),
        decoration: InputDecoration(
          hintText: 'Search family members...',
          hintStyle: GoogleFonts.plusJakartaSans(
            fontSize: 15,
            color: const Color(0xFF6B7280),
          ),
          prefixIcon: const Icon(Icons.search, color: Color(0xFF6B7280), size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  Widget _buildHorizontalFilterChips() {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: _filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final isSelected = _selectedFilter == index;
          if (isSelected) {
            return Container(
              height: 44,
              padding: const EdgeInsets.symmetric(horizontal: 22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFFA44CFF), Color(0xFF5B14B8)],
                ),
                borderRadius: BorderRadius.circular(9999),
              ),
              child: Center(
                child: Text(
                  _filters[index],
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            );
          } else {
            return InkWell(
              borderRadius: BorderRadius.circular(9999),
              onTap: () => setState(() => _selectedFilter = index),
              child: Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 22),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCE9FF),
                  borderRadius: BorderRadius.circular(9999),
                ),
                child: Center(
                  child: Text(
                    _filters[index],
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF494552),
                    ),
                  ),
                ),
              ),
            );
          }
        },
      ),
    );
  }

  Widget _buildMemberCard(BuildContext context, Map<String, dynamic> member) {
    final bool isPending = member['isPending'] == true;
    final String name = member['name'] as String;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFCBC4D4)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF28006D).withValues(alpha: 0.08),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Avatar, Name & Verified Badge
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.asset(
                  member['avatar'] as String,
                  width: 64,
                  height: 64,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    width: 64,
                    height: 64,
                    color: const Color(0xFFDCE9FF),
                    child: const Icon(Icons.person, color: Color(0xFF28006D), size: 32),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0B1C30),
                            ),
                          ),
                        ),
                        if (member['verified'] == true)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF75F2FE).withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(9999),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.verified, size: 12, color: Color(0xFF006971)),
                                const SizedBox(width: 4),
                                Text(
                                  'Verified',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF006971),
                                  ),
                                ),
                              ],
                            ),
                          )
                        else
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFCBC4D4).withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(9999),
                            ),
                            child: Text(
                              'Pending',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF7A7583),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      member['relation'] as String,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: const Color(0xFF494552),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Status Bento Items
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF4FF),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Health Card Status',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    color: const Color(0xFF494552),
                  ),
                ),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: member['healthCardColor'] as Color,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      member['healthCardStatus'] as String,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: member['healthCardColor'] as Color,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF4FF),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Insurance',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    color: const Color(0xFF494552),
                  ),
                ),
                Text(
                  member['insurance'] as String,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF0B1C30),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF4FF),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Consent Status',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    color: const Color(0xFF494552),
                  ),
                ),
                Text(
                  member['consentStatus'] as String,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: member['consentColor'] as Color,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Actions Row
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 40,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0xFFA44CFF), Color(0xFF5B14B8)],
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () {
                      if (isPending) {
                        Navigator.of(context).pushNamed(
                          AppRoutes.invitationSent,
                          arguments: member,
                        );
                      } else {
                        Navigator.of(context).pushNamed(
                          AppRoutes.sharedHealthCardDependent,
                          arguments: {
                            'name': member['name'],
                            'relation': member['relation'],
                            'avatar': member['avatar'],
                            'insurance': member['insurance'],
                          },
                        );
                      }
                    },
                    child: Text(
                      isPending ? 'Resend Invite' : 'View Details',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFCBC4D4)),
                ),
                child: IconButton(
                  padding: EdgeInsets.zero,
                  icon: const Icon(Icons.share_outlined, size: 18, color: Color(0xFF0B1C30)),
                  onPressed: () {
                    Navigator.of(context).pushNamed(AppRoutes.memberPermissionsSharing);
                  },
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFFDAD6)),
                ),
                child: IconButton(
                  padding: EdgeInsets.zero,
                  icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Color(0xFFBA1A1A)),
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: Text(
                          isPending ? 'Cancel Invitation' : 'Remove Family Member',
                          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700),
                        ),
                        content: Text(
                          isPending
                              ? 'Are you sure you want to cancel the pending invitation to $name?'
                              : 'Are you sure you want to remove $name from your family network?',
                          style: GoogleFonts.plusJakartaSans(fontSize: 14),
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(ctx).pop(),
                            child: Text('Keep', style: GoogleFonts.plusJakartaSans()),
                          ),
                          TextButton(
                            onPressed: () async {
                              Navigator.of(ctx).pop();
                              bool success = true;
                              if (isPending && member['invitationId'] != null) {
                                final res = await FamilyService.instance.cancelInvitation(member['invitationId']!);
                                success = res.isSuccess;
                              } else if (member['id'] != null) {
                                final res = await FamilyService.instance.removeFamilyMember(member['id']!);
                                success = res.isSuccess;
                              }
                              AppDataSyncManager.instance.notifyFamilyUpdated();
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      success
                                          ? (isPending ? 'Invitation cancelled' : 'Family member removed')
                                          : 'Operation processed.',
                                      style: GoogleFonts.plusJakartaSans(fontSize: 13),
                                    ),
                                    backgroundColor: success ? const Color(0xFF28006D) : const Color(0xFFBA1A1A),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              }
                            },
                            child: Text(
                              isPending ? 'Revoke' : 'Remove',
                              style: GoogleFonts.plusJakartaSans(color: const Color(0xFFBA1A1A), fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
