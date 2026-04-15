import 'package:flutter/material.dart';
import '../theme/jana_colors.dart';

class JanaLeftNavRail extends StatelessWidget {
  const JanaLeftNavRail({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return NavigationRail(
      selectedIndex: 0,
      backgroundColor: JanaColors.cardBackground,
      onDestinationSelected: (index) {},
      labelType: NavigationRailLabelType.all,
      destinations: const [
        NavigationRailDestination(
          icon: Icon(Icons.chat),
          label: Text('Chat'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.history),
          label: Text('History'),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.settings),
          label: Text('Settings'),
        ),
      ],
    );
  }
}
