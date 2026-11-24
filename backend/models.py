import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Admin(Base):
    __tablename__ = "admin"

    admin_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    moderators = relationship("Moderator", back_populates="admin")


class Moderator(Base):
    __tablename__ = "moderator"

    moderator_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    admin_id = Column(Integer, ForeignKey("admin.admin_id"), nullable=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    admin = relationship("Admin", back_populates="moderators")
    attackers = relationship("Attacker", back_populates="moderator")
    defenders = relationship("Defender", back_populates="moderator")
    challenges = relationship("Challenge", back_populates="moderator")


class Attacker(Base):
    __tablename__ = "attacker"

    attacker_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    moderator_id = Column(Integer, ForeignKey("moderator.moderator_id"), nullable=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    moderator = relationship("Moderator", back_populates="attackers")
    attempts = relationship("Attempt", back_populates="attacker")


class Defender(Base):
    __tablename__ = "defender"

    defender_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    moderator_id = Column(Integer, ForeignKey("moderator.moderator_id"), nullable=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    moderator = relationship("Moderator", back_populates="defenders")
    defenses = relationship("Defense", back_populates="defender")


class Challenge(Base):
    __tablename__ = "challenges"

    challenge_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    moderator_id = Column(Integer, ForeignKey("moderator.moderator_id"), nullable=True)
    title = Column(String(100), nullable=False)
    vulnerability_type = Column(String(50), nullable=False)
    difficulty = Column(String(20), default="Medium", nullable=False)
    dvwa_page_ref = Column(String(100), nullable=False)
    reference_payload = Column(Text, nullable=False)

    # Relationships
    moderator = relationship("Moderator", back_populates="challenges")
    attempts = relationship("Attempt", back_populates="challenge")
    defenses = relationship("Defense", back_populates="challenge")
    alerts = relationship("Alert", back_populates="challenge")


class Attempt(Base):
    __tablename__ = "attempts"

    attempt_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    attacker_id = Column(Integer, ForeignKey("attacker.attacker_id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.challenge_id"), nullable=False)
    payload_used = Column(Text, nullable=False)
    status = Column(String(20), nullable=False)  # 'success', 'failed', 'blocked'
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    score_earned = Column(Integer, default=0, nullable=False)

    # Relationships
    attacker = relationship("Attacker", back_populates="attempts")
    challenge = relationship("Challenge", back_populates="attempts")


class Defense(Base):
    __tablename__ = "defenses"

    defense_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    defender_id = Column(Integer, ForeignKey("defender.defender_id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("challenges.challenge_id"), nullable=False)
    security_level_applied = Column(String(20), nullable=False)  # 'low', 'medium', 'high', 'impossible'
    verified = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    score_earned = Column(Integer, default=0, nullable=False)

    # Relationships
    defender = relationship("Defender", back_populates="defenses")
    challenge = relationship("Challenge", back_populates="defenses")


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    challenge_id = Column(Integer, ForeignKey("challenges.challenge_id"), nullable=True)
    alert_type = Column(String(50), nullable=False)  # e.g. 'EXPLOIT_DETECTED', 'DEFENSE_APPLIED'
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    challenge = relationship("Challenge", back_populates="alerts")
