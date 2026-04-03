// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_app/main.dart';

void main() {
  testWidgets('App loads successfully', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const LumosityCloneApp());

    // Verify that the app title is present
    expect(find.text('Brain Training Hub'), findsOneWidget);

    // Verify that the welcome text is present
    expect(find.textContaining('Welcome'), findsOneWidget);

    // Verify that the start training button is present
    expect(find.text('Start Training'), findsOneWidget);
  });
}
