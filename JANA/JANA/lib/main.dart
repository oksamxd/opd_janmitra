import 'package:flutter/material.dart';
import 'features/jana_ai/domain/models/jana_app_mode.dart';
import 'features/jana_ai/presentation/pages/jana_ai_page.dart';
import 'features/jana_ai/presentation/pages/jana_associate_dashboard.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Jana AI UI Demo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF008080)),
        useMaterial3: true,
      ),
      home: const DemoSelector(),
    );
  }
}

class DemoSelector extends StatelessWidget {
  const DemoSelector({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Select Mode')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const JanaAiPage(
                    mode: JanaAppMode.member,
                  ),
                ),
              ),
              child: const Text('Launch Member Mode'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const JanaAssociateDashboard(),
                ),
              ),
              child: const Text('Launch Associate Mode'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const JanaAiPage(
                    mode: JanaAppMode.web,
                  ),
                ),
              ),
              child: const Text('Launch Web Mode'),
            ),
          ],
        ),
      ),
    );
  }
}
