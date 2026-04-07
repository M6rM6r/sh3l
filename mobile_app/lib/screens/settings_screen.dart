import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _soundEnabled = true;
  bool _notificationsEnabled = true;
  bool _darkMode = true;
  String _language = 'en';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _soundEnabled = prefs.getBool('sound_enabled') ?? true;
      _notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;
      _darkMode = prefs.getBool('dark_mode') ?? true;
      _language = prefs.getString('language') ?? 'en';
    });
  }

  Future<void> _saveBool(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
  }

  Future<void> _saveString(String key, String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Settings', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          _SectionHeader(title: 'Audio & Notifications'),
          _SettingsTile(
            icon: Icons.volume_up_rounded,
            iconColor: const Color(0xFF4FC3F7),
            title: 'Sound Effects',
            subtitle: 'Play sounds during games',
            trailing: Switch(
              value: _soundEnabled,
              activeColor: const Color(0xFF4FC3F7),
              onChanged: (val) {
                setState(() => _soundEnabled = val);
                _saveBool('sound_enabled', val);
              },
            ),
          ),
          _SettingsTile(
            icon: Icons.notifications_rounded,
            iconColor: const Color(0xFF66BB6A),
            title: 'Notifications',
            subtitle: 'Daily brain training reminders',
            trailing: Switch(
              value: _notificationsEnabled,
              activeColor: const Color(0xFF4FC3F7),
              onChanged: (val) {
                setState(() => _notificationsEnabled = val);
                _saveBool('notifications_enabled', val);
              },
            ),
          ),
          const SizedBox(height: 8),
          _SectionHeader(title: 'Appearance'),
          _SettingsTile(
            icon: Icons.dark_mode_rounded,
            iconColor: const Color(0xFFAB47BC),
            title: 'Dark Mode',
            subtitle: 'Use dark theme across the app',
            trailing: Switch(
              value: _darkMode,
              activeColor: const Color(0xFF4FC3F7),
              onChanged: (val) {
                setState(() => _darkMode = val);
                _saveBool('dark_mode', val);
              },
            ),
          ),
          _SettingsTile(
            icon: Icons.language_rounded,
            iconColor: const Color(0xFFFFB74D),
            title: 'Language',
            subtitle: 'App display language',
            trailing: DropdownButton<String>(
              value: _language,
              dropdownColor: const Color(0xFF122140),
              underline: const SizedBox.shrink(),
              icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF4FC3F7)),
              items: const [
                DropdownMenuItem(value: 'en', child: Text('English', style: TextStyle(color: Colors.white70, fontSize: 14))),
                DropdownMenuItem(value: 'ar', child: Text('العربية', style: TextStyle(color: Colors.white70, fontSize: 14))),
              ],
              onChanged: (val) {
                if (val == null) return;
                setState(() => _language = val);
                _saveString('language', val);
              },
            ),
          ),
          const SizedBox(height: 8),
          _SectionHeader(title: 'About'),
          _SettingsTile(
            icon: Icons.info_outline_rounded,
            iconColor: Colors.white38,
            title: 'App Version',
            subtitle: '1.0.0 (build 1)',
            trailing: const SizedBox.shrink(),
          ),
          _SettingsTile(
            icon: Icons.privacy_tip_outlined,
            iconColor: Colors.white38,
            title: 'Privacy Policy',
            subtitle: 'View our privacy policy',
            trailing: const Icon(Icons.chevron_right, color: Colors.white38),
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.description_outlined,
            iconColor: Colors.white38,
            title: 'Terms of Service',
            subtitle: 'View terms and conditions',
            trailing: const Icon(Icons.chevron_right, color: Colors.white38),
            onTap: () {},
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 16, 8, 8),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          color: Color(0xFF4FC3F7),
          fontSize: 11,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.4,
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final Widget trailing;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700)),
        subtitle: Text(subtitle, style: const TextStyle(color: Colors.white38, fontSize: 12)),
        trailing: trailing,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      ),
    );
  }
}
